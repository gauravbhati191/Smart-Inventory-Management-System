const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'kanhaiyateli2005',
    database: process.env.DB_NAME || 'inventory_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test the connection
pool.getConnection()
    .then(connection => {
        console.log('Successfully connected to MySQL Database!');
        connection.release();
    })
    .catch(err => {
        console.error('Error connecting to MySQL Database (It may not exist yet, run init-db script first):', err.message);
    });

module.exports = pool;
