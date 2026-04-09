const db = require('../config/db');
const xlsx = require('xlsx');

// @desc    Get all products
// @route   GET /api/products
exports.getProducts = async (req, res) => {
    try {
        const [products] = await db.query(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY p.id DESC
        `);
        res.json({ success: true, data: products });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get single product (also by barcode)
// @route   GET /api/products/:id
exports.getProduct = async (req, res) => {
    try {
        const [products] = await db.query('SELECT * FROM products WHERE id = ? OR barcode = ?', [req.params.id, req.params.id]);

        if (products.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, data: products[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = async (req, res) => {
    const { name, category_id, price, stock, min_stock_level, image_url, barcode } = req.body;

    if (!name || !price) {
        return res.status(400).json({ success: false, message: 'Please provide name and price' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO products (name, category_id, price, stock, min_stock_level, image_url, barcode) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, category_id || null, price, stock || 0, min_stock_level || 5, image_url || '', barcode || null]
        );
        res.status(201).json({ success: true, data: { id: result.insertId, ...req.body } });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Barcode already exists' });
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res) => {
    const { name, category_id, price, stock, min_stock_level, image_url, barcode } = req.body;

    try {
        const [products] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (products.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        await db.query(
            'UPDATE products SET name = ?, category_id = ?, price = ?, stock = ?, min_stock_level = ?, image_url = ?, barcode = ? WHERE id = ?',
            [
                name || products[0].name,
                category_id !== undefined ? category_id : products[0].category_id,
                price || products[0].price,
                stock !== undefined ? stock : products[0].stock,
                min_stock_level !== undefined ? min_stock_level : products[0].min_stock_level,
                image_url || products[0].image_url,
                barcode || products[0].barcode,
                req.params.id
            ]
        );

        res.json({ success: true, message: 'Product updated successfully' });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, message: 'Barcode already exists' });
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, message: 'Product removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Export products to Excel
// @route   GET /api/products/export
// @access  Private
exports.exportProducts = async (req, res) => {
    try {
        const [products] = await db.query(`
            SELECT p.id as ID, p.barcode as Barcode, p.name as "Product Name", c.name as Category, 
                   p.price as Price, p.stock as Stock, p.min_stock_level as "Min Stock", 
                   DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i') as "Created At", 
                   DATE_FORMAT(p.updated_at, '%Y-%m-%d %H:%i') as "Updated At"
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY p.id ASC
        `);

        if (!products.length) {
            return res.status(404).json({ success: false, message: 'No products to export' });
        }

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(products);
        xlsx.utils.book_append_sheet(wb, ws, "Inventory_Products");

        const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.set({
            'Content-Disposition': 'attachment; filename="inventory_products.xlsx"',
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        res.send(excelBuffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error during export' });
    }
};

// @desc    Import products from Excel
// @route   POST /api/products/import
// @access  Private/Admin
exports.importProducts = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
        const wsName = wb.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(wb.Sheets[wsName]);

        if (!rows.length) {
            return res.status(400).json({ success: false, message: 'Excel file is empty' });
        }

        const [categories] = await db.query('SELECT id, name FROM categories');
        const catMap = {};
        categories.forEach(c => {
            if (c.name) catMap[c.name.toLowerCase()] = c.id;
        });

        let addedCount = 0;
        let updatedCount = 0;

        for (let row of rows) {
            const name = row['Product Name'] || row['name'] || row['Name'];
            const barcode = row['Barcode'] || row['barcode'] || null;
            const price = parseFloat(row['Price'] || row['price']) || 0;
            const stock = parseInt(row['Stock'] || row['stock']) || 0;
            const minStock = parseInt(row['Min Stock'] || row['min_stock_level']) || 5;
            const catNameStr = row['Category'] || row['category_name'];

            if (!name && !barcode) continue;

            let catId = null;
            // Lookup category ID if a name was provided
            if (catNameStr && catNameStr.trim() !== '') {
                const catLower = catNameStr.trim().toLowerCase();
                if (catMap[catLower]) {
                    catId = catMap[catLower];
                } else {
                    // Auto-create the category if it doesn't exist
                    const [insCat] = await db.query('INSERT INTO categories (name) VALUES (?)', [catNameStr.trim()]);
                    catId = insCat.insertId;
                    catMap[catLower] = catId; // cache it
                }
            }

            // Check if product exists by barcode or name
            let existingParams = [];
            let existingQuery = 'SELECT id FROM products WHERE ';
            if (barcode) {
                existingQuery += 'barcode = ? OR name = ?';
                existingParams.push(String(barcode), name);
            } else {
                existingQuery += 'name = ?';
                existingParams.push(name);
            }

            const [existing] = await db.query(existingQuery, existingParams);

            if (existing.length > 0) {
                // Update
                await db.query(`
                    UPDATE products SET 
                        price = ?, stock = ?, min_stock_level = ?, category_id = ?, barcode = ?
                    WHERE id = ?
                `, [price, stock, minStock, catId, barcode, existing[0].id]);
                updatedCount++;
            } else {
                // Insert
                await db.query(`
                    INSERT INTO products (name, barcode, price, stock, min_stock_level, category_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [name, barcode, price, stock, minStock, catId]);
                addedCount++;
            }
        }

        res.json({
            success: true,
            message: `Import complete. Added ${addedCount} new, updated ${updatedCount} existing.`
        });

    } catch (error) {
        console.error('Import Error:', error);
        res.status(500).json({ success: false, message: 'Failed to process Excel file' });
    }
};

// Categories
// @desc    Get all categories
// @route   GET /api/products/categories/all
exports.getCategories = async (req, res) => {
    try {
        const [categories] = await db.query('SELECT * FROM categories');
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Create category
// @route   POST /api/products/categories
// @access  Private/Admin
exports.createCategory = async (req, res) => {
    if (!req.body.name) {
        return res.status(400).json({ success: false, message: 'Name is required' });
    }
    try {
        const [result] = await db.query('INSERT INTO categories (name) VALUES (?)', [req.body.name]);
        res.status(201).json({ success: true, data: { id: result.insertId, name: req.body.name } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update category
// @route   PUT /api/products/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res) => {
    if (!req.body.name) {
        return res.status(400).json({ success: false, message: 'Name is required' });
    }
    try {
        const [result] = await db.query('UPDATE categories SET name = ? WHERE id = ?', [req.body.name, req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.json({ success: true, data: { id: req.params.id, name: req.body.name } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete category
// @route   DELETE /api/products/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res) => {
    try {
        // Optional: Check if products exist in this category before deleting
        const [productsList] = await db.query('SELECT id FROM products WHERE category_id = ?', [req.params.id]);
        if (productsList.length > 0) {
            return res.status(400).json({ success: false, message: 'Cannot delete: Category has existing products. Please reassign them first.' });
        }

        const [result] = await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.json({ success: true, message: 'Category removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Export categories to Excel
// @route   GET /api/products/categories/export
// @access  Private
exports.exportCategories = async (req, res) => {
    try {
        const [categories] = await db.query(`
            SELECT id as ID, name as Category, 
                   DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as "Created At", 
                   DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i') as "Updated At"
            FROM categories 
            ORDER BY id ASC
        `);

        if (!categories.length) {
            return res.status(404).json({ success: false, message: 'No categories to export' });
        }

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(categories);
        xlsx.utils.book_append_sheet(wb, ws, "Inventory_Categories");

        const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.set({
            'Content-Disposition': 'attachment; filename="inventory_categories.xlsx"',
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        res.send(excelBuffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error during export' });
    }
};

// @desc    Import categories from Excel
// @route   POST /api/products/categories/import
// @access  Private/Admin
exports.importCategories = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
        const wsName = wb.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(wb.Sheets[wsName]);

        if (!rows.length) {
            return res.status(400).json({ success: false, message: 'Excel file is empty' });
        }

        let addedCount = 0;
        let updatedCount = 0;

        for (let row of rows) {
            const name = row['Category'] || row['name'] || row['Name'];
            const id = row['ID'] || row['id']; // optional update by ID if provided

            if (!name || name.trim() === '') continue;

            const categoryName = name.trim();

            // Check if category exists by name
            const [existingByName] = await db.query('SELECT id FROM categories WHERE name = ?', [categoryName]);

            if (existingByName.length > 0) {
                // If it already exists by name, we conceptually 'updated' it 
                // Since it's just a name, an update is functionally identical to ignoring it,
                // but we will count it as updated if we need to sync timestamps.
                await db.query('UPDATE categories SET name = ? WHERE id = ?', [categoryName, existingByName[0].id]);
                updatedCount++;
            } else if (id) {
                // Or try by ID
                const [existingById] = await db.query('SELECT id FROM categories WHERE id = ?', [id]);
                if (existingById.length > 0) {
                    await db.query('UPDATE categories SET name = ? WHERE id = ?', [categoryName, id]);
                    updatedCount++;
                } else {
                    await db.query('INSERT INTO categories (id, name) VALUES (?, ?)', [id, categoryName]);
                    addedCount++;
                }
            } else {
                // Completely new insertion without ID
                await db.query('INSERT INTO categories (name) VALUES (?)', [categoryName]);
                addedCount++;
            }
        }

        res.json({
            success: true,
            message: `Import complete. Added ${addedCount} new, updated ${updatedCount} existing.`
        });

    } catch (error) {
        console.error('Category Import Error:', error);
        res.status(500).json({ success: false, message: 'Failed to process Excel file' });
    }
};
