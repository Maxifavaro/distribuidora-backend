const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');
const { auth, requireRole } = require('../middleware/auth');

// GET todos los productos con JOIN a proveedores, rubros y marcas
router.get('/', async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        p.ID_Producto as id,
        p.Descripcion as name,
        p.Pr_Ean13 as sku,
        p.PrecioFinalUni as price,
        p.Stock as stock,
        p.ID_Proveedor as provider_id,
        prov.RazonSocial as provider_name,
        p.ID_Rubro as rubro_id,
        r.descripcion as rubro_name,
        p.idMarca as marca_id,
        m.Mrc_Descripcion as marca_name,
        p.IdAlicIva as alicuota_id,
        p.AlicIva_desc as alicuota_desc,
        p.Costo,
        p.CostoUnit,
        p.margen,
        p.PrecioFinalPack,
        p.PrecioNetoPack,
        p.PrecioNetoUni,
        p.MontoIVA,
        p.PMR,
        p.Pr_Pack,
        p.Pr_UniXPack,
        p.Estado,
        p.OcultarApp,
        p.SinStockApp,
        p.PermiteDescuento as permite_descuento
      FROM Productos p
      LEFT JOIN Proveedores prov ON p.ID_Proveedor = prov.ID_Proveedor
      LEFT JOIN Rubros r ON p.ID_Rubro = r.id_rubro
      LEFT JOIN Marca m ON p.idMarca = m.Id_Marca
      ORDER BY p.ID_Producto
    `);
    res.json(result.recordset);
  } catch (err) { next(err); }
});

// GET producto por ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          p.ID_Producto as id,
          p.Descripcion as name,
          p.Pr_Ean13 as sku,
          p.PrecioFinalUni as price,
          p.Stock as stock,
          p.ID_Proveedor as provider_id,
          p.ID_Rubro as rubro_id,
          p.idMarca as marca_id,
          p.IdAlicIva as alicuota_id,
          p.*
        FROM Productos p
        WHERE p.ID_Producto = @id
      `);
    if (result.recordset.length === 0) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) { next(err); }
});

// POST crear producto
router.post('/', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { 
      name, sku, price, stock, provider_id, rubro_id, marca_id, alicuota_id,
      costo, costoUnit, margen, precioFinalPack, precioNetoPack, precioNetoUni,
      montoIVA, pmr, pack, uniXPack, estado, permite_descuento
    } = req.body;
    
    const pool = await poolPromise;
    const result = await pool.request()
      .input('Descripcion', sql.NVarChar(999), name)
      .input('Pr_Ean13', sql.NVarChar(15), sku || null)
      .input('PrecioFinalUni', sql.Real, price || 0)
      .input('Stock', sql.Int, stock || 0)
      .input('ID_Proveedor', sql.Int, provider_id)
      .input('ID_Rubro', sql.Int, rubro_id || 1)
      .input('idMarca', sql.Int, marca_id || null)
      .input('IdAlicIva', sql.Int, alicuota_id || null)
      .input('Costo', sql.Real, costo || 0)
      .input('CostoUnit', sql.Real, costoUnit || 0)
      .input('margen', sql.Real, margen || 0)
      .input('PrecioFinalPack', sql.Real, precioFinalPack || 0)
      .input('PrecioNetoPack', sql.Real, precioNetoPack || 0)
      .input('PrecioNetoUni', sql.Real, precioNetoUni || 0)
      .input('MontoIVA', sql.Real, montoIVA || 0)
      .input('PMR', sql.Int, pmr || 1)
      .input('Pr_Pack', sql.NVarChar(3), pack || 'UN')
      .input('Pr_UniXPack', sql.Int, uniXPack || 1)
      .input('Estado', sql.NVarChar(50), estado || 'Activo')
      .input('PermiteDescuento', sql.Bit, permite_descuento !== undefined ? permite_descuento : true)
      .query(`
        INSERT INTO Productos (
          Descripcion, Pr_Ean13, PrecioFinalUni, Stock, ID_Proveedor, ID_Rubro,
          idMarca, IdAlicIva, Costo, CostoUnit, margen, PrecioFinalPack,
          PrecioNetoPack, PrecioNetoUni, MontoIVA, PMR, Pr_Pack, Pr_UniXPack, Estado, PermiteDescuento
        ) OUTPUT INSERTED.ID_Producto
        VALUES (
          @Descripcion, @Pr_Ean13, @PrecioFinalUni, @Stock, @ID_Proveedor, @ID_Rubro,
          @idMarca, @IdAlicIva, @Costo, @CostoUnit, @margen, @PrecioFinalPack,
          @PrecioNetoPack, @PrecioNetoUni, @MontoIVA, @PMR, @Pr_Pack, @Pr_UniXPack, @Estado, @PermiteDescuento
        )
      `);
    
    const newId = result.recordset[0].ID_Producto;
    const newProduct = await pool.request()
      .input('id', sql.Int, newId)
      .query('SELECT ID_Producto as id, Descripcion as name, Pr_Ean13 as sku, PrecioFinalUni as price, Stock as stock, ID_Proveedor as provider_id FROM Productos WHERE ID_Producto = @id');
    
    res.status(201).json(newProduct.recordset[0]);
  } catch (err) { next(err); }
});

// PUT actualizar producto
router.put('/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      name, sku, price, stock, provider_id, rubro_id, marca_id, alicuota_id,
      costo, costoUnit, margen, precioFinalPack, precioNetoPack, precioNetoUni,
      montoIVA, pmr, pack, uniXPack, estado, permite_descuento
    } = req.body;
    
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, id)
      .input('Descripcion', sql.NVarChar(999), name)
      .input('Pr_Ean13', sql.NVarChar(15), sku || null)
      .input('PrecioFinalUni', sql.Real, price || 0)
      .input('Stock', sql.Int, stock || 0)
      .input('ID_Proveedor', sql.Int, provider_id)
      .input('ID_Rubro', sql.Int, rubro_id || 1)
      .input('idMarca', sql.Int, marca_id || null)
      .input('IdAlicIva', sql.Int, alicuota_id || null)
      .input('Costo', sql.Real, costo || 0)
      .input('CostoUnit', sql.Real, costoUnit || 0)
      .input('margen', sql.Real, margen || 0)
      .input('PrecioFinalPack', sql.Real, precioFinalPack || 0)
      .input('PrecioNetoPack', sql.Real, precioNetoPack || 0)
      .input('PrecioNetoUni', sql.Real, precioNetoUni || 0)
      .input('MontoIVA', sql.Real, montoIVA || 0)
      .input('PMR', sql.Int, pmr || 1)
      .input('Pr_Pack', sql.NVarChar(3), pack || 'UN')
      .input('Pr_UniXPack', sql.Int, uniXPack || 1)
      .input('Estado', sql.NVarChar(50), estado || 'Activo')
      .input('PermiteDescuento', sql.Bit, permite_descuento !== undefined ? permite_descuento : true)
      .query(`
        UPDATE Productos SET
          Descripcion = @Descripcion,
          Pr_Ean13 = @Pr_Ean13,
          PrecioFinalUni = @PrecioFinalUni,
          Stock = @Stock,
          ID_Proveedor = @ID_Proveedor,
          ID_Rubro = @ID_Rubro,
          idMarca = @idMarca,
          IdAlicIva = @IdAlicIva,
          Costo = @Costo,
          CostoUnit = @CostoUnit,
          margen = @margen,
          PrecioFinalPack = @PrecioFinalPack,
          PrecioNetoPack = @PrecioNetoPack,
          PrecioNetoUni = @PrecioNetoUni,
          MontoIVA = @MontoIVA,
          PMR = @PMR,
          Pr_Pack = @Pr_Pack,
          Pr_UniXPack = @Pr_UniXPack,
          Estado = @Estado,
          PermiteDescuento = @PermiteDescuento
        WHERE ID_Producto = @id
      `);
    
    const updated = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT ID_Producto as id, Descripcion as name, Pr_Ean13 as sku, PrecioFinalUni as price, Stock as stock, ID_Proveedor as provider_id FROM Productos WHERE ID_Producto = @id');
    
    if (updated.recordset.length === 0) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(updated.recordset[0]);
  } catch (err) { next(err); }
});

// DELETE producto
router.delete('/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Productos WHERE ID_Producto = @id');
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
