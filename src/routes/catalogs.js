const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');

// Localidades
router.get('/localidades', async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT ID_Localidad as id, RTRIM(Nombre) as nombre FROM Localidad ORDER BY Nombre');
    res.json(result.recordset);
  } catch (err) { next(err); }
});

// Zonas
router.get('/zonas', async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT ID_Zona as id, RTRIM(Descripcion) as descripcion FROM Zona ORDER BY Descripcion');
    res.json(result.recordset);
  } catch (err) { next(err); }
});

// Barrios
router.get('/barrios', async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT ID_Barrio as id, RTRIM(Nombre) as nombre FROM Barrios ORDER BY Nombre');
    res.json(result.recordset);
  } catch (err) { next(err); }
});

// Condiciones de Pago
router.get('/condiciones-pago', async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT ID_CondicionPago as id, RTRIM(Descripcion) as descripcion FROM CondicionPago ORDER BY Descripcion');
    res.json(result.recordset);
  } catch (err) { next(err); }
});

module.exports = router;
