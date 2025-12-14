const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Clients ORDER BY id');
    res.json(result.recordset);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool.request().input('id', sql.Int, id).query('SELECT * FROM Clients WHERE id = @id');
    if (result.recordset.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.post('/', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, address, phone, email } = req.body;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('name', sql.NVarChar(200), name)
      .input('address', sql.NVarChar(300), address)
      .input('phone', sql.NVarChar(50), phone)
      .input('email', sql.NVarChar(200), email)
      .query('INSERT INTO Clients (name, address, phone, email) OUTPUT INSERTED.* VALUES (@name,@address,@phone,@email)');
    res.status(201).json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.put('/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, address, phone, email } = req.body;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar(200), name)
      .input('address', sql.NVarChar(300), address)
      .input('phone', sql.NVarChar(50), phone)
      .input('email', sql.NVarChar(200), email)
      .query('UPDATE Clients SET name=@name, address=@address, phone=@phone, email=@email WHERE id=@id; SELECT * FROM Clients WHERE id=@id');
    if (result.recordset.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    await pool.request().input('id', sql.Int, id).query('DELETE FROM Clients WHERE id=@id');
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
