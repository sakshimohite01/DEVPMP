const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.get('/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view all users' });
    }
    const users = await db.allAsync('SELECT user_id, name, role, email, mobile_number, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


router.post('/register', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can register users' });
    }

    const { name, role, email, password, mobile_number } = req.body;

    if (!name || !role || !email || !password) {
      return res.status(400).json({ error: 'Name, role, email, and password are required' });
    }

    if (!['admin', 'manager', 'driver'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existingUser = await db.getAsync('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.runAsync(
      'INSERT INTO users (name, role, email, password, mobile_number) VALUES (?, ?, ?, ?, ?)',
      [name, role, email, hashedPassword, mobile_number || null]
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        user_id: result.lastID,
        name,
        role,
        email,
        mobile_number: mobile_number || null
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await db.getAsync('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        role: user.role,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.getAsync('SELECT user_id, name, role, email, mobile_number FROM users WHERE user_id = ?', [req.user.user_id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update users' });
    }

    const { name, role, email, mobile_number, password } = req.body;
    const userId = req.params.id;

    const existingUser = await db.getAsync('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (email && email !== existingUser.email) {
      const emailExists = await db.getAsync('SELECT * FROM users WHERE email = ?', [email]);
      if (emailExists) {
        return res.status(400).json({ error: 'Email already registered' });
      }
    }

    let updateQuery = 'UPDATE users SET name = ?, role = ?, email = ?, mobile_number = ?';
    let updateParams = [
      name || existingUser.name,
      role || existingUser.role,
      email || existingUser.email,
      mobile_number !== undefined ? mobile_number : existingUser.mobile_number
    ];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ', password = ?';
      updateParams.push(hashedPassword);
    }

    updateQuery += ' WHERE user_id = ?';
    updateParams.push(userId);

    await db.runAsync(updateQuery, updateParams);

    const updatedUser = await db.getAsync(
      'SELECT user_id, name, role, email, mobile_number, created_at FROM users WHERE user_id = ?',
      [userId]
    );

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete users' });
    }

    const userId = req.params.id;

    if (parseInt(userId) === req.user.user_id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await db.getAsync('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const trips = await db.getAsync('SELECT COUNT(*) as count FROM trips WHERE driver_id = ?', [userId]);
    if (trips.count > 0) {
      return res.status(400).json({ error: 'Cannot delete user with existing trips. Please reassign trips first.' });
    }

    await db.runAsync('DELETE FROM vehicle_drivers WHERE driver_id = ?', [userId]);

    await db.runAsync('DELETE FROM users WHERE user_id = ?', [userId]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
