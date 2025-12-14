const express = require('express');
const router = express.Router();
const { poolPromise } = require('../db');
const bcrypt = require('bcrypt');
const { auth, requireRole } = require('../middleware/auth');

// GET /users - List all users (admin only)
router.get('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query('SELECT id, username, permission, created_at FROM Users ORDER BY username');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /users - Create a new user (admin only)
router.post('/', auth, requireRole('admin'), async (req, res) => {
  const { username, password, permission } = req.body;
  
  if (!username || !password || !permission) {
    return res.status(400).json({ error: 'username, password, and permission are required' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const pool = await poolPromise;
    
    // Check if user already exists
    const checkResult = await pool.request()
      .input('username', username)
      .query('SELECT id FROM Users WHERE username = @username');
    
    if (checkResult.recordset.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Insert new user
    const result = await pool.request()
      .input('username', username)
      .input('password', hashedPassword)
      .input('permission', permission)
      .query(`
        INSERT INTO Users (username, password, permission)
        VALUES (@username, @password, @permission);
        SELECT @@IDENTITY as id;
      `);
    
    const userId = result.recordset[0].id;
    res.status(201).json({ id: userId, username, permission, message: 'User created successfully' });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /users/:id - Update user (admin only)
// Can update username, password, and/or permission
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { username, password, permission } = req.body;
  
  if (!username && !password && !permission) {
    return res.status(400).json({ error: 'At least one field (username, password, permission) is required' });
  }
  
  try {
    const pool = await poolPromise;
    
    // Build dynamic query based on provided fields
    let query = 'UPDATE Users SET ';
    const request = pool.request().input('id', parseInt(id));
    const updates = [];
    
    if (username) {
      updates.push('username = @username');
      request.input('username', username);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = @password');
      request.input('password', hashedPassword);
    }
    if (permission) {
      updates.push('permission = @permission');
      request.input('permission', permission);
    }
    
    query += updates.join(', ') + ' WHERE id = @id';
    
    const result = await request.query(query);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /users/:id - Delete user (admin only)
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', parseInt(id))
      .query('DELETE FROM Users WHERE id = @id');
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
