const db = require('../config/db');

// @desc    Create a new sale
// @route   POST /api/sales
// @access  Private
exports.createSale = async (req, res) => {
    const { items } = req.body; // items: [{ product_id, quantity, price }]

    if (!items || items.length === 0) {
        return res.status(400).json({ success: false, message: 'No items in sale' });
    }

    try {
        // Calculate total and prepare connection for transaction
        let total_amount = 0;
        for (let item of items) {
            total_amount += (item.quantity * item.price);
        }

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Create Sale Record
            const [saleResult] = await connection.query(
                'INSERT INTO sales (user_id, total_amount) VALUES (?, ?)',
                [req.user.id, total_amount]
            );
            const sale_id = saleResult.insertId;

            // 2. Insert Sale Items & Update Stock
            for (let item of items) {
                await connection.query(
                    'INSERT INTO sales_items (sale_id, product_id, quantity, price_at_sale) VALUES (?, ?, ?, ?)',
                    [sale_id, item.product_id, item.quantity, item.price]
                );

                // Reduce stock
                await connection.query(
                    'UPDATE products SET stock = stock - ? WHERE id = ?',
                    [item.quantity, item.product_id]
                );
            }

            await connection.commit();
            res.status(201).json({ success: true, message: 'Sale completed', sale_id });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error during sale checkout' });
    }
};

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private
exports.getSales = async (req, res) => {
    try {
        const [sales] = await db.query(`
            SELECT s.*, u.username as cashier 
            FROM sales s
            LEFT JOIN users u ON s.user_id = u.id
            ORDER BY s.sale_date DESC
        `);
        res.json({ success: true, data: sales });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get sale by ID with items
// @route   GET /api/sales/:id
// @access  Private
exports.getSaleById = async (req, res) => {
    try {
        const [sales] = await db.query('SELECT * FROM sales WHERE id = ?', [req.params.id]);
        if (sales.length === 0) {
            return res.status(404).json({ success: false, message: 'Sale not found' });
        }

        const [items] = await db.query(`
            SELECT si.*, p.name as product_name 
            FROM sales_items si
            JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = ?
        `, [req.params.id]);

        res.json({ success: true, data: { ...sales[0], items } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
