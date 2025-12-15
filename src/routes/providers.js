const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        p.ID_Proveedor as id,
        RTRIM(p.RazonSocial) as razon_social,
        RTRIM(p.Direccion) as direccion,
        RTRIM(p.Numero) as numero,
        RTRIM(p.Telefono) as telefono,
        RTRIM(p.CUIT) as cuit,
        RTRIM(p.Correo) as correo,
        p.ID_Condicion as id_condicion,
        RTRIM(cp.Descripcion) as condicion_pago,
        p.Barrio as id_barrio,
        RTRIM(b.Nombre) as barrio_nombre,
        p.Localidad as id_localidad,
        RTRIM(l.Nombre) as localidad_nombre,
        RTRIM(p.Estado) as estado
      FROM Proveedores p
      LEFT JOIN CondicionPago cp ON p.ID_Condicion = cp.ID_CondicionPago
      LEFT JOIN Barrios b ON p.Barrio = b.ID_Barrio
      LEFT JOIN Localidad l ON p.Localidad = l.ID_Localidad
      ORDER BY p.ID_Proveedor DESC
    `);
    res.json(result.recordset);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          p.*,
          RTRIM(cp.Descripcion) as condicion_pago,
          RTRIM(b.Nombre) as barrio_nombre,
          RTRIM(l.Nombre) as localidad_nombre
        FROM Proveedores p
        LEFT JOIN CondicionPago cp ON p.ID_Condicion = cp.ID_CondicionPago
        LEFT JOIN Barrios b ON p.Barrio = b.ID_Barrio
        LEFT JOIN Localidad l ON p.Localidad = l.ID_Localidad
        WHERE p.ID_Proveedor = @id
      `);
    if (result.recordset.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.post('/', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { razon_social, direccion, numero, telefono, cuit, correo, id_condicion, id_barrio, id_localidad } = req.body;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('razon_social', sql.VarChar(50), razon_social)
      .input('direccion', sql.VarChar(50), direccion || '')
      .input('numero', sql.VarChar(10), numero || '')
      .input('telefono', sql.VarChar(20), telefono || '')
      .input('cuit', sql.VarChar(50), cuit || '')
      .input('correo', sql.VarChar(50), correo || '')
      .input('id_condicion', sql.Int, id_condicion || null)
      .input('id_barrio', sql.Int, id_barrio || null)
      .input('id_localidad', sql.Int, id_localidad || null)
      .query(`
        INSERT INTO Proveedores (RazonSocial, Direccion, Numero, Telefono, CUIT, Correo, ID_Condicion, Barrio, Localidad, CodigoPostal, SitioWeb, Fax, IB, NroCuenta, Estado)
        OUTPUT INSERTED.ID_Proveedor as id, RTRIM(INSERTED.RazonSocial) as razon_social
        VALUES (@razon_social, @direccion, @numero, @telefono, @cuit, @correo, @id_condicion, @id_barrio, @id_localidad, '', '', '', '', '', 'ACTIVO')
      `);
    res.status(201).json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.put('/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { razon_social, direccion, numero, telefono, cuit, correo, id_condicion, id_barrio, id_localidad } = req.body;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('razon_social', sql.VarChar(50), razon_social)
      .input('direccion', sql.VarChar(50), direccion || '')
      .input('numero', sql.VarChar(10), numero || '')
      .input('telefono', sql.VarChar(20), telefono || '')
      .input('cuit', sql.VarChar(50), cuit || '')
      .input('correo', sql.VarChar(50), correo || '')
      .input('id_condicion', sql.Int, id_condicion || null)
      .input('id_barrio', sql.Int, id_barrio || null)
      .input('id_localidad', sql.Int, id_localidad || null)
      .query(`
        UPDATE Proveedores SET
          RazonSocial=@razon_social,
          Direccion=@direccion,
          Numero=@numero,
          Telefono=@telefono,
          CUIT=@cuit,
          Correo=@correo,
          ID_Condicion=@id_condicion,
          Barrio=@id_barrio,
          Localidad=@id_localidad
        WHERE ID_Proveedor=@id;
        
        SELECT ID_Proveedor as id, RTRIM(RazonSocial) as razon_social
        FROM Proveedores WHERE ID_Proveedor=@id
      `);
    if (result.recordset.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    await pool.request().input('id', sql.Int, id).query('DELETE FROM Proveedores WHERE ID_Proveedor=@id');
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
