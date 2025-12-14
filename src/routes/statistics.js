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
          p.id,
          p.name,
          p.sku,
          SUM(oi.quantity) as total_quantity,
          SUM(oi.quantity * oi.unit_price) as total_revenue,
          COUNT(DISTINCT o.id) as order_count
        FROM Products p
        INNER JOIN OrderItems oi ON p.id = oi.product_id
        INNER JOIN Orders o ON oi.order_id = o.id
        WHERE o.order_type = 'client'
          AND o.created_at >= DATEADD(day, -@days, GETDATE())
        GROUP BY p.id, p.name, p.sku
        ORDER BY total_quantity DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching top products' });
  }
});

// GET /api/statistics/top-providers - Proveedores que más compraron últimos 30 días
router.get('/top-providers', auth, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('days', sql.Int, 30)
      .query(`
        SELECT 
          pr.id,
          pr.name,
          pr.contact,
          pr.phone,
          COUNT(DISTINCT o.id) as order_count,
          SUM(o.total_amount) as total_amount,
          SUM(oi.quantity) as total_items
        FROM Providers pr
        INNER JOIN Orders o ON pr.id = o.provider_id
        INNER JOIN OrderItems oi ON o.id = oi.order_id
        WHERE o.order_type = 'supplier'
          AND o.created_at >= DATEADD(day, -@days, GETDATE())
        GROUP BY pr.id, pr.name, pr.contact, pr.phone
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
          c.id,
          c.name,
          c.phone,
          c.email,
          COUNT(DISTINCT o.id) as order_count,
          SUM(o.total_amount) as total_amount,
          SUM(oi.quantity) as total_items
        FROM Clients c
        INNER JOIN Orders o ON c.id = o.client_id
        INNER JOIN OrderItems oi ON o.id = oi.order_id
        WHERE o.order_type = 'client'
          AND o.created_at >= DATEADD(day, -@days, GETDATE())
        GROUP BY c.id, c.name, c.phone, c.email
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
          p.id,
          p.name,
          p.sku,
          SUM(oi.quantity) as total_quantity,
          SUM(oi.quantity * oi.unit_price) as total_spent
        FROM Products p
        INNER JOIN OrderItems oi ON p.id = oi.product_id
        INNER JOIN Orders o ON oi.order_id = o.id
        WHERE o.client_id = @clientId
          AND o.order_type = 'client'
          AND o.created_at >= DATEADD(day, -@days, GETDATE())
        GROUP BY p.id, p.name, p.sku
        ORDER BY total_quantity DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching client products' });
  }
});

module.exports = router;
