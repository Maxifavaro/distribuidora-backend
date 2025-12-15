const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT ID_Rubro as id_rubro, RTRIM(Descripcion) as descripcion FROM Rubros ORDER BY ID_Rubro');
    res.json(result.recordset);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool.request().input('id', sql.Int, id).query('SELECT ID_Rubro as id_rubro, RTRIM(Descripcion) as descripcion FROM Rubros WHERE ID_Rubro = @id');
    if (result.recordset.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.post('/', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { descripcion } = req.body;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('descripcion', sql.VarChar(40), descripcion)
      .query('INSERT INTO Rubros (Descripcion) OUTPUT INSERTED.ID_Rubro as id_rubro, RTRIM(INSERTED.Descripcion) as descripcion VALUES (@descripcion)');
    res.status(201).json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.put('/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { descripcion } = req.body;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('descripcion', sql.VarChar(40), descripcion)
      .query('UPDATE Rubros SET Descripcion=@descripcion WHERE ID_Rubro=@id; SELECT ID_Rubro as id_rubro, RTRIM(Descripcion) as descripcion FROM Rubros WHERE ID_Rubro=@id');
    if (result.recordset.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    await pool.request().input('id', sql.Int, id).query('DELETE FROM Rubros WHERE ID_Rubro=@id');
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
