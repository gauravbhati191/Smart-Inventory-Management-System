const mysql = require('mysql2/promise');
require('dotenv').config();

async function initializeDatabase() {
    try {
        // Connect without a specific database first to create it
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'kanhaiyateli2005'
        });

        console.log('Connected to MySQL. Creating database if it does not exist...');
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'inventory_db'}\`;`);

        await connection.changeUser({ database: process.env.DB_NAME || 'inventory_db' });
        console.log(`Switched to database: ${process.env.DB_NAME || 'inventory_db'}. Creating tables...`);

        // 1. users table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('admin', 'staff') DEFAULT 'staff',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table `users` checked/created.');

        // 2. categories table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE
            );
        `);
        console.log('Table `categories` checked/created.');

        // 3. products table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                category_id INT,
                price DECIMAL(10, 2) NOT NULL,
                stock INT DEFAULT 0,
                min_stock_level INT DEFAULT 5,
                image_url VARCHAR(255) DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
            );
        `);
        console.log('Table `products` checked/created.');

        // 4. sales table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS sales (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                total_amount DECIMAL(10, 2) NOT NULL,
                sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            );
        `);
        console.log('Table `sales` checked/created.');

        // 5. sales_items table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS sales_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sale_id INT,
                product_id INT,
                quantity INT NOT NULL,
                price_at_sale DECIMAL(10, 2) NOT NULL,
                FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
            );
        `);
        console.log('Table `sales_items` checked/created.');

        console.log('Database initialization completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

initializeDatabase();
