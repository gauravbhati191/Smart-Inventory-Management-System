const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
    try {
        const [users] = await db.query('SELECT * FROM users WHERE role = ?', ['admin']);
        if (users.length === 0) {
            console.log('No admin found. Creating default admin...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);

            await db.query(
                'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
                ['Master Admin', 'admin@ims.com', hashedPassword, 'admin']
            );
            console.log('\n=============================================');
            console.log('✅ Admin Account Created!');
            console.log('Email: admin@ims.com');
            console.log('Password: admin123');
            console.log('=============================================\n');
        } else {
            console.log('Admin already exists.');
            console.log('Email:', users[0].email);
        }
        process.exit(0);
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
}

seedAdmin();
