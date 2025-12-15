const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        c.ID_Cliente as id,
        RTRIM(c.RazonSocial) as razon_social,
        RTRIM(c.Apellido) as apellido,
        RTRIM(c.Nombre) as nombre,
        RTRIM(c.Direccion) as direccion,
        RTRIM(c.Numero) as numero,
        RTRIM(c.Telefono) as telefono,
        RTRIM(c.CUIT) as cuit,
        RTRIM(c.correo) as correo,
        c.ID_Barrio as id_barrio,
        RTRIM(b.Nombre) as barrio_nombre,
        c.ID_Localidad as id_localidad,
        RTRIM(l.Nombre) as localidad_nombre,
        c.ID_Zona as id_zona,
        RTRIM(z.Descripcion) as zona_nombre,
        c.id_condicion,
        RTRIM(cp.Descripcion) as condicion_pago,
        RTRIM(c.Estado) as estado
      FROM Clientes c
      LEFT JOIN Barrios b ON c.ID_Barrio = b.ID_Barrio
      LEFT JOIN Localidad l ON c.ID_Localidad = l.ID_Localidad
      LEFT JOIN Zona z ON c.ID_Zona = z.ID_Zona
      LEFT JOIN CondicionPago cp ON c.id_condicion = cp.ID_CondicionPago
      ORDER BY c.ID_Cliente DESC
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
          c.*,
          RTRIM(b.Nombre) as barrio_nombre,
          RTRIM(l.Nombre) as localidad_nombre,
          RTRIM(z.Descripcion) as zona_nombre,
          RTRIM(cp.Descripcion) as condicion_pago
        FROM Clientes c
        LEFT JOIN Barrios b ON c.ID_Barrio = b.ID_Barrio
        LEFT JOIN Localidad l ON c.ID_Localidad = l.ID_Localidad
        LEFT JOIN Zona z ON c.ID_Zona = z.ID_Zona
        LEFT JOIN CondicionPago cp ON c.id_condicion = cp.ID_CondicionPago
        WHERE c.ID_Cliente = @id
      `);
    if (result.recordset.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.post('/', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { nombre, apellido, razon_social, direccion, numero, telefono, cuit, correo, id_barrio, id_localidad, id_zona, id_condicion } = req.body;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('nombre', sql.VarChar(50), nombre)
      .input('apellido', sql.VarChar(50), apellido || '')
      .input('razon_social', sql.VarChar(255), razon_social || '')
      .input('direccion', sql.VarChar(50), direccion || '')
      .input('numero', sql.VarChar(50), numero || '')
      .input('telefono', sql.VarChar(50), telefono || '')
      .input('cuit', sql.VarChar(50), cuit || '')
      .input('correo', sql.VarChar(50), correo || '')
      .input('id_barrio', sql.Int, id_barrio || null)
      .input('id_localidad', sql.Int, id_localidad || null)
      .input('id_zona', sql.Int, id_zona || null)
      .input('id_condicion', sql.Int, id_condicion || null)
      .query(`
        INSERT INTO Clientes (Nombre, Apellido, RazonSocial, Direccion, Numero, Telefono, CUIT, correo, ID_Barrio, ID_Localidad, ID_Zona, id_condicion, IngresosBrutos, CodigoPostal, sitioweb, FechaAlta, Estado)
        OUTPUT INSERTED.ID_Cliente as id, RTRIM(INSERTED.Nombre) as nombre, RTRIM(INSERTED.Apellido) as apellido, RTRIM(INSERTED.RazonSocial) as razon_social
        VALUES (@nombre, @apellido, @razon_social, @direccion, @numero, @telefono, @cuit, @correo, @id_barrio, @id_localidad, @id_zona, @id_condicion, '', '', '', GETDATE(), 'ACTIVO')
      `);
    res.status(201).json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.put('/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, razon_social, direccion, numero, telefono, cuit, correo, id_barrio, id_localidad, id_zona, id_condicion } = req.body;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('nombre', sql.VarChar(50), nombre)
      .input('apellido', sql.VarChar(50), apellido || '')
      .input('razon_social', sql.VarChar(255), razon_social || '')
      .input('direccion', sql.VarChar(50), direccion || '')
      .input('numero', sql.VarChar(50), numero || '')
      .input('telefono', sql.VarChar(50), telefono || '')
      .input('cuit', sql.VarChar(50), cuit || '')
      .input('correo', sql.VarChar(50), correo || '')
      .input('id_barrio', sql.Int, id_barrio || null)
      .input('id_localidad', sql.Int, id_localidad || null)
      .input('id_zona', sql.Int, id_zona || null)
      .input('id_condicion', sql.Int, id_condicion || null)
      .query(`
        UPDATE Clientes SET
          Nombre=@nombre,
          Apellido=@apellido,
          RazonSocial=@razon_social,
          Direccion=@direccion,
          Numero=@numero,
          Telefono=@telefono,
          CUIT=@cuit,
          correo=@correo,
          ID_Barrio=@id_barrio,
          ID_Localidad=@id_localidad,
          ID_Zona=@id_zona,
          id_condicion=@id_condicion
        WHERE ID_Cliente=@id;
        
        SELECT ID_Cliente as id, RTRIM(Nombre) as nombre, RTRIM(Apellido) as apellido, RTRIM(RazonSocial) as razon_social
        FROM Clientes WHERE ID_Cliente=@id
      `);
    if (result.recordset.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    await pool.request().input('id', sql.Int, id).query('DELETE FROM Clientes WHERE ID_Cliente=@id');
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
