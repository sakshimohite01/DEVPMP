const db = require('../database/db');
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
  try {
    console.log('Initializing database...');

    const adminExists = await db.getAsync("SELECT * FROM users WHERE role = 'admin'");
    
    if (!adminExists) {
      const defaultPassword = await bcrypt.hash('admin123', 10);
      await db.runAsync(
        'INSERT INTO users (name, role, email, password) VALUES (?, ?, ?, ?)',
        ['Admin User', 'admin', 'admin@example.com', defaultPassword]
      );
      console.log('✓ Default admin user created:');
      console.log('  Email: admin@example.com');
      console.log('  Password: admin123');
    } else {
      console.log('✓ Admin user already exists');
    }

    console.log('✓ Database initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Database initialization error:', error);
    process.exit(1);
  }
}

initializeDatabase();





