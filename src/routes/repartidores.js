const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');
const { auth, requireRole } = require('../middleware/auth');

// GET todos los repartidores
router.get('/', auth, async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        ID_Repartidor as id,
        RTRIM(Nombre) as nombre,
        RTRIM(Apellido) as apellido,
        RTRIM(DNI) as dni,
        RTRIM(Telefono) as telefono,
        RTRIM(Direccion) as direccion,
        RTRIM(Email) as email,
        FechaIngreso as fecha_ingreso,
        RTRIM(Estado) as estado,
        RTRIM(Observaciones) as observaciones,
        RTRIM(LicenciaConducir) as licencia_conducir,
        VencimientoLicencia as vencimiento_licencia,
        CreatedAt as created_at,
        UpdatedAt as updated_at
      FROM Repartidores
      ORDER BY ID_Repartidor DESC
    `);
    res.json(result.recordset);
  } catch (err) { next(err); }
});

// GET repartidor por ID
router.get('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          ID_Repartidor as id,
          RTRIM(Nombre) as nombre,
          RTRIM(Apellido) as apellido,
          RTRIM(DNI) as dni,
          RTRIM(Telefono) as telefono,
          RTRIM(Direccion) as direccion,
          RTRIM(Email) as email,
          FechaIngreso as fecha_ingreso,
          RTRIM(Estado) as estado,
          RTRIM(Observaciones) as observaciones,
          RTRIM(LicenciaConducir) as licencia_conducir,
          VencimientoLicencia as vencimiento_licencia,
          CreatedAt as created_at,
          UpdatedAt as updated_at
        FROM Repartidores
        WHERE ID_Repartidor = @id
      `);
    if (result.recordset.length === 0) return res.status(404).json({ message: 'Repartidor no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
});

// POST crear nuevo repartidor
router.post('/', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { nombre, apellido, dni, telefono, direccion, email, fecha_ingreso, estado, observaciones, licencia_conducir, vencimiento_licencia } = req.body;
    
    if (!nombre || !apellido) {
      return res.status(400).json({ message: 'Nombre y apellido son requeridos' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('nombre', sql.NVarChar(100), nombre)
      .input('apellido', sql.NVarChar(100), apellido)
      .input('dni', sql.VarChar(20), dni || null)
      .input('telefono', sql.VarChar(50), telefono || null)
      .input('direccion', sql.NVarChar(200), direccion || null)
      .input('email', sql.NVarChar(100), email || null)
      .input('fecha_ingreso', sql.DateTime, fecha_ingreso ? new Date(fecha_ingreso) : new Date())
      .input('estado', sql.VarChar(50), estado || 'Activo')
      .input('observaciones', sql.NVarChar(255), observaciones || null)
      .input('licencia_conducir', sql.VarChar(50), licencia_conducir || null)
      .input('vencimiento_licencia', sql.DateTime, vencimiento_licencia ? new Date(vencimiento_licencia) : null)
      .query(`
        INSERT INTO Repartidores (Nombre, Apellido, DNI, Telefono, Direccion, Email, FechaIngreso, Estado, Observaciones, LicenciaConducir, VencimientoLicencia)
        OUTPUT INSERTED.ID_Repartidor as id, 
               INSERTED.Nombre as nombre, 
               INSERTED.Apellido as apellido, 
               INSERTED.DNI as dni,
               INSERTED.Telefono as telefono,
               INSERTED.Estado as estado
        VALUES (@nombre, @apellido, @dni, @telefono, @direccion, @email, @fecha_ingreso, @estado, @observaciones, @licencia_conducir, @vencimiento_licencia)
      `);
    
    res.status(201).json(result.recordset[0]);
  } catch (err) { next(err); }
});

// PUT actualizar repartidor
router.put('/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, dni, telefono, direccion, email, fecha_ingreso, estado, observaciones, licencia_conducir, vencimiento_licencia } = req.body;

    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, id)
      .input('nombre', sql.NVarChar(100), nombre)
      .input('apellido', sql.NVarChar(100), apellido)
      .input('dni', sql.VarChar(20), dni || null)
      .input('telefono', sql.VarChar(50), telefono || null)
      .input('direccion', sql.NVarChar(200), direccion || null)
      .input('email', sql.NVarChar(100), email || null)
      .input('fecha_ingreso', sql.DateTime, fecha_ingreso ? new Date(fecha_ingreso) : null)
      .input('estado', sql.VarChar(50), estado || 'Activo')
      .input('observaciones', sql.NVarChar(255), observaciones || null)
      .input('licencia_conducir', sql.VarChar(50), licencia_conducir || null)
      .input('vencimiento_licencia', sql.DateTime, vencimiento_licencia ? new Date(vencimiento_licencia) : null)
      .query(`
        UPDATE Repartidores SET
          Nombre = @nombre,
          Apellido = @apellido,
          DNI = @dni,
          Telefono = @telefono,
          Direccion = @direccion,
          Email = @email,
          FechaIngreso = @fecha_ingreso,
          Estado = @estado,
          Observaciones = @observaciones,
          LicenciaConducir = @licencia_conducir,
          VencimientoLicencia = @vencimiento_licencia,
          UpdatedAt = GETDATE()
        WHERE ID_Repartidor = @id
      `);
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          ID_Repartidor as id,
          RTRIM(Nombre) as nombre,
          RTRIM(Apellido) as apellido,
          RTRIM(Estado) as estado
        FROM Repartidores WHERE ID_Repartidor=@id
      `);
    
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
});

// DELETE eliminar repartidor
router.delete('/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    
    // Verificar si hay pedidos asociados
    const ordersCheck = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM TomadePedido WHERE ID_Repartidor = @id');
    
    if (ordersCheck.recordset[0].count > 0) {
      return res.status(400).json({ 
        message: `No se puede eliminar el repartidor porque tiene ${ordersCheck.recordset[0].count} pedido(s) asociado(s). Considere cambiar el estado a Inactivo.` 
      });
    }
    
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Repartidores WHERE ID_Repartidor=@id');
    
    res.json({ message: 'Repartidor eliminado' });
  } catch (err) { next(err); }
});

module.exports = router;
