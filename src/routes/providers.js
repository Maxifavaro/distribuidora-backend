const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Providers ORDER BY id');
    res.json(result.recordset);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool.request().input('id', sql.Int, id).query('SELECT * FROM Providers WHERE id = @id');
    if (result.recordset.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.post('/', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, contact, phone, email } = req.body;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('name', sql.NVarChar(200), name)
      .input('contact', sql.NVarChar(200), contact)
      .input('phone', sql.NVarChar(50), phone)
      .input('email', sql.NVarChar(200), email)
      .query('INSERT INTO Providers (name, contact, phone, email) OUTPUT INSERTED.* VALUES (@name,@contact,@phone,@email)');
    res.status(201).json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.put('/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, contact, phone, email } = req.body;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar(200), name)
      .input('contact', sql.NVarChar(200), contact)
      .input('phone', sql.NVarChar(50), phone)
      .input('email', sql.NVarChar(200), email)
      .query('UPDATE Providers SET name=@name, contact=@contact, phone=@phone, email=@email WHERE id=@id; SELECT * FROM Providers WHERE id=@id');
    if (result.recordset.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    await pool.request().input('id', sql.Int, id).query('DELETE FROM Providers WHERE id=@id');
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
