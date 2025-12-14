const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sql, poolPromise } = require('../db');
const secret = process.env.JWT_SECRET || 'jwt_secret';

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const pool = await poolPromise;
    const result = await pool.request().input('username', sql.NVarChar(200), username).query('SELECT id, username, password, permission FROM Users WHERE username = @username');
    if (result.recordset.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
    const user = result.recordset[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });
    const payload = { id: user.id, username: user.username, permission: user.permission };
    const token = jwt.sign(payload, secret, { expiresIn: '6h' });
    res.json({ token, user: payload });
  } catch (err) { next(err); }
});

// Optional: registration endpoint
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, permission } = req.body;
    const pool = await poolPromise;
    
    if (!username || !password || !permission) {
      return res.status(400).json({ message: 'username, password, and permission are required' });
    }
    
    const hash = await bcrypt.hash(password, 10);
    const insertRes = await pool.request()
      .input('username', sql.NVarChar(200), username)
      .input('password', sql.NVarChar(300), hash)
      .input('permission', sql.NVarChar(100), permission)
      .query('INSERT INTO Users (username, password, permission) OUTPUT INSERTED.id, INSERTED.username, INSERTED.permission VALUES (@username, @password, @permission)');
    
    const newUser = insertRes.recordset[0];
    res.status(201).json(newUser);
  } catch (err) { next(err); }
});

module.exports = router;
