const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');
const { auth } = require('../middleware/auth');

// GET /api/statistics/top-products - Productos más vendidos últimos 30 días
router.get('/top-products', auth, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('days', sql.Int, 30)
      .query(`
        SELECT 
          p.ID_Producto as id,
          p.Descripcion as name,
          p.Pr_Ean13 as sku,
          SUM(dt.Cantidad) as total_quantity,
          SUM(dt.Cantidad * dt.PrecioUnitario) as total_revenue,
          COUNT(DISTINCT tp.ID_TomaPedido) as order_count
        FROM Productos p
        INNER JOIN DetalleTomadePedido dt ON p.ID_Producto = dt.ID_Producto
        INNER JOIN TomadePedido tp ON dt.ID_TomaPedido = tp.ID_TomaPedido
        WHERE tp.Fecha >= DATEADD(day, -@days, GETDATE())
        GROUP BY p.ID_Producto, p.Descripcion, p.Pr_Ean13
        ORDER BY total_quantity DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching top products' });
  }
});

// GET /api/statistics/top-providers - Proveedores de productos más vendidos últimos 30 días
router.get('/top-providers', auth, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('days', sql.Int, 30)
      .query(`
        SELECT 
          pr.ID_Proveedor as id,
          pr.RazonSocial as name,
          pr.Contacto as contact,
          pr.Telefono as phone,
          COUNT(DISTINCT p.ID_Producto) as product_count,
          SUM(dt.Cantidad * dt.PrecioUnitario) as total_amount,
          SUM(dt.Cantidad) as total_items
        FROM Proveedores pr
        INNER JOIN Productos p ON pr.ID_Proveedor = p.ID_Proveedor
        INNER JOIN DetalleTomadePedido dt ON p.ID_Producto = dt.ID_Producto
        INNER JOIN TomadePedido tp ON dt.ID_TomaPedido = tp.ID_TomaPedido
        WHERE tp.Fecha >= DATEADD(day, -@days, GETDATE())
        GROUP BY pr.ID_Proveedor, pr.Razon_Social, pr.Contacto, pr.Telefono
        ORDER BY total_amount DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching top providers' });
  }
});

// GET /api/statistics/top-clients - Clientes que más compraron últimos 30 días
router.get('/top-clients', auth, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('days', sql.Int, 30)
      .query(`
        SELECT 
          c.ID_Cliente as id,
          c.Nombre + ' ' + ISNULL(c.Apellido, '') as name,
          c.Telefono as phone,
          c.Correo as email,
          COUNT(DISTINCT tp.ID_TomaPedido) as order_count,
          SUM(tp.Total) as total_amount,
          SUM(dt.Cantidad) as total_items
        FROM Clientes c
        INNER JOIN TomadePedido tp ON c.ID_Cliente = tp.ID_Cliente
        INNER JOIN DetalleTomadePedido dt ON tp.ID_TomaPedido = dt.ID_TomaPedido
        WHERE tp.Fecha >= DATEADD(day, -@days, GETDATE())
        GROUP BY c.ID_Cliente, c.Nombre, c.Apellido, c.Telefono, c.Correo
        ORDER BY total_amount DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching top clients' });
  }
});

// GET /api/statistics/client-products/:clientId - Productos comprados por cliente últimos 30 días
router.get('/client-products/:clientId', auth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const pool = await poolPromise;
    const result = await pool.request()
      .input('clientId', sql.Int, clientId)
      .input('days', sql.Int, 30)
      .query(`
        SELECT 
          p.ID_Producto as id,
          p.Descripcion as name,
          p.Pr_Ean13 as sku,
          SUM(dt.Cantidad) as total_quantity,
          SUM(dt.Cantidad * dt.PrecioUnitario) as total_spent
        FROM Productos p
        INNER JOIN DetalleTomadePedido dt ON p.ID_Producto = dt.ID_Producto
        INNER JOIN TomadePedido tp ON dt.ID_TomaPedido = tp.ID_TomaPedido
        WHERE tp.ID_Cliente = @clientId
          AND tp.Fecha >= DATEADD(day, -@days, GETDATE())
        GROUP BY p.ID_Producto, p.Descripcion, p.Pr_Ean13
        ORDER BY total_quantity DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching client products' });
  }
});

module.exports = router;
