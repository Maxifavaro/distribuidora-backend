const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');
const { auth, requireRole } = require('../middleware/auth');

// GET todas las marcas (opcionalmente filtradas por rubro)
router.get('/', async (req, res, next) => {
  try {
    const { rubro_id } = req.query;
    const pool = await poolPromise;
    
    if (rubro_id) {
      // Obtener marcas que tienen productos en el rubro especificado
      const result = await pool.request()
        .input('rubro_id', sql.Int, parseInt(rubro_id, 10))
        .query(`
          SELECT DISTINCT 
            m.Id_Marca as id_marca,
            RTRIM(m.Mrc_Descripcion) as descripcion
          FROM Marca m
          INNER JOIN Productos p ON m.Id_Marca = p.idMarca
          WHERE p.ID_Rubro = @rubro_id
          ORDER BY m.Mrc_Descripcion
        `);
      res.json(result.recordset);
    } else {
      // Obtener todas las marcas
      const result = await pool.request().query(`
        SELECT 
          Id_Marca as id_marca,
          RTRIM(Mrc_Descripcion) as descripcion
        FROM Marca
        ORDER BY Mrc_Descripcion
      `);
      res.json(result.recordset);
    }
  } catch (err) { next(err); }
});

// POST crear marca
router.post('/', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { descripcion } = req.body;
    if (!descripcion) return res.status(400).json({ error: 'Descripción requerida' });
    
    const pool = await poolPromise;
    const result = await pool.request()
      .input('descripcion', sql.VarChar(30), descripcion)
      .query(`
        INSERT INTO Marca (Mrc_Descripcion) 
        OUTPUT INSERTED.Id_Marca as id_marca, RTRIM(INSERTED.Mrc_Descripcion) as descripcion
        VALUES (@descripcion)
      `);
    res.status(201).json(result.recordset[0]);
  } catch (err) { next(err); }
});

// PUT actualizar marca
router.put('/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { descripcion } = req.body;
    if (!descripcion) return res.status(400).json({ error: 'Descripción requerida' });
    
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, parseInt(id, 10))
      .input('descripcion', sql.VarChar(30), descripcion)
      .query(`
        UPDATE Marca 
        SET Mrc_Descripcion = @descripcion 
        WHERE Id_Marca = @id
      `);
    
    res.json({ id_marca: parseInt(id, 10), descripcion });
  } catch (err) { next(err); }
});

// DELETE eliminar marca
router.delete('/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    
    // Verificar si hay productos con esta marca
    const checkResult = await pool.request()
      .input('id', sql.Int, parseInt(id, 10))
      .query('SELECT COUNT(*) as count FROM Productos WHERE idMarca = @id');
    
    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar la marca porque tiene productos asociados' 
      });
    }
    
    await pool.request()
      .input('id', sql.Int, parseInt(id, 10))
      .query('DELETE FROM Marca WHERE Id_Marca = @id');
    
    res.json({ message: 'Marca eliminada' });
  } catch (err) { next(err); }
});

module.exports = router;
