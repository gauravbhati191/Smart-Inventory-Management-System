const db = require('../config/db');

// @desc    Get Dashboard Stats
// @route   GET /api/reports/dashboard
// @access  Private
// @desc    Get Advanced Dashboard Stats for Tailwind
exports.getDashboardStats = async (req, res) => {
    try {
        const [productCount] = await db.query('SELECT COUNT(*) as count FROM products');
        const [lowStockCount] = await db.query('SELECT COUNT(*) as count FROM products WHERE stock > 0 AND stock <= min_stock_level');
        const [outOfStockCount] = await db.query('SELECT COUNT(*) as count FROM products WHERE stock = 0');
        const [inStockCount] = await db.query('SELECT COUNT(*) as count FROM products WHERE stock > min_stock_level');
        const [inventoryValue] = await db.query('SELECT SUM(price * stock) as total FROM products');
        const [categoryCount] = await db.query('SELECT COUNT(*) as count FROM categories');

        // Category Valuation for Bar Chart
        const [categoryValuation] = await db.query(`
            SELECT c.name as category, SUM(p.price * p.stock) as value
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            GROUP BY c.id
            ORDER BY value DESC
        `);

        // Recent generic items for the table
        const [recentProducts] = await db.query(`
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY p.id DESC
            LIMIT 5
        `);

        res.json({
            success: true,
            data: {
                totalProducts: productCount[0].count,
                lowStockCount: lowStockCount[0].count,
                outOfStockCount: outOfStockCount[0].count,
                inStockCount: inStockCount[0].count,
                totalInventoryValue: inventoryValue[0].total || 0,
                totalCategories: categoryCount[0].count,
                categoryValuation,
                recentProducts
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get Recent Actions (Today only)
// @route   GET /api/reports/recent-actions
// @access  Private
exports.getRecentActions = async (req, res) => {
    try {
        const [products] = await db.query(`
            SELECT id, name, created_at, updated_at, 'product' as type 
            FROM products 
            WHERE DATE(created_at) = CURDATE() OR (updated_at IS NOT NULL AND DATE(updated_at) = CURDATE())
        `);

        const [categories] = await db.query(`
            SELECT id, name, created_at, updated_at, 'category' as type 
            FROM categories 
            WHERE DATE(created_at) = CURDATE() OR (updated_at IS NOT NULL AND DATE(updated_at) = CURDATE())
        `);

        let actions = [];

        products.forEach(p => {
            const created = new Date(p.created_at);
            if (created.toDateString() === new Date().toDateString()) {
                actions.push({ id: p.id, type: 'product', action: 'added', name: p.name, timestamp: p.created_at });
            }
            if (p.updated_at) {
                const updated = new Date(p.updated_at);
                if (updated.getTime() !== created.getTime() && updated.toDateString() === new Date().toDateString()) {
                    actions.push({ id: p.id, type: 'product', action: 'edited', name: p.name, timestamp: p.updated_at });
                }
            }
        });

        categories.forEach(c => {
            const created = new Date(c.created_at);
            if (created.toDateString() === new Date().toDateString()) {
                actions.push({ id: c.id, type: 'category', action: 'added', name: c.name, timestamp: c.created_at });
            }
            if (c.updated_at) {
                const updated = new Date(c.updated_at);
                if (updated.getTime() !== created.getTime() && updated.toDateString() === new Date().toDateString()) {
                    actions.push({ id: c.id, type: 'category', action: 'edited', name: c.name, timestamp: c.updated_at });
                }
            }
        });

        // Sort descending by timestamp
        actions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json({ success: true, data: actions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
