const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Products ORDER BY id');
    res.json(result.recordset);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool.request().input('id', sql.Int, id).query('SELECT * FROM Products WHERE id = @id');
    if (result.recordset.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.post('/', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, sku, price, stock, provider_id } = req.body;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('name', sql.NVarChar(200), name)
      .input('sku', sql.NVarChar(100), sku)
      .input('price', sql.Decimal(10,2), price)
      .input('stock', sql.Int, stock)
      .input('provider_id', sql.Int, provider_id)
      .query('INSERT INTO Products (name, sku, price, stock, provider_id) OUTPUT INSERTED.* VALUES (@name,@sku,@price,@stock,@provider_id)');
    res.status(201).json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.put('/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, sku, price, stock, provider_id } = req.body;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar(200), name)
      .input('sku', sql.NVarChar(100), sku)
      .input('price', sql.Decimal(10,2), price)
      .input('stock', sql.Int, stock)
      .input('provider_id', sql.Int, provider_id)
      .query('UPDATE Products SET name=@name, sku=@sku, price=@price, stock=@stock, provider_id=@provider_id WHERE id=@id; SELECT * FROM Products WHERE id=@id');
    if (result.recordset.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    await pool.request().input('id', sql.Int, id).query('DELETE FROM Products WHERE id=@id');
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
