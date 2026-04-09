const db = require('../config/db');

async function patchDatabase() {
    try {
        console.log('Patching database...');
        try {
            await db.query('ALTER TABLE products ADD COLUMN barcode VARCHAR(255) UNIQUE DEFAULT NULL;');
            console.log('✅ Barcode column added to products table.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ Barcode column already exists.');
            } else {
                throw e;
            }
        }
        process.exit(0);
    } catch (error) {
        console.error('Error patching database:', error);
        process.exit(1);
    }
}

patchDatabase();
