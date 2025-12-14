const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');
const { auth, requireRole } = require('../middleware/auth');

// List orders (optionally filter by type/provider/client)
router.get('/', auth, async (req, res, next) => {
  try {
    const { type, provider_id, client_id } = req.query;
    const pool = await poolPromise;
    let query = `SELECT o.id, o.order_type, o.provider_id, o.client_id, o.total_amount, o.created_at, o.delivery_type, p.name provider_name, c.name client_name FROM Orders o
      LEFT JOIN Providers p ON o.provider_id = p.id
      LEFT JOIN Clients c ON o.client_id = c.id`;
    let where = [];
    if (type) where.push("o.order_type = @type");
    if (provider_id) where.push("o.provider_id = @provider_id");
    if (client_id) where.push("o.client_id = @client_id");
    if (where.length) query += ' WHERE ' + where.join(' AND ');
    query += ' ORDER BY o.created_at DESC';
    const request = pool.request();
    if (type) request.input('type', sql.NVarChar(20), type);
    if (provider_id) request.input('provider_id', sql.Int, provider_id);
    if (client_id) request.input('client_id', sql.Int, client_id);
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) { next(err); }
});

// Get order details
router.get('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    const orderRes = await pool.request().input('id', sql.Int, id).query('SELECT * FROM Orders WHERE id = @id');
    if (orderRes.recordset.length === 0) return res.status(404).json({ message: 'Not found' });
    const order = orderRes.recordset[0];
    const itemsRes = await pool.request().input('order_id', sql.Int, id).query('SELECT oi.*, p.name, p.sku FROM OrderItems oi JOIN Products p ON p.id = oi.product_id WHERE oi.order_id = @order_id');
    order.items = itemsRes.recordset;
    res.json(order);
  } catch (err) { next(err); }
});

// Create order
router.post('/', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { order_type, provider_id, client_id, items, delivery_type } = req.body;
    if (!order_type || !Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Invalid payload' });

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const totalAmount = items.reduce((s, it) => s + (parseFloat(it.unit_price || 0) * parseInt(it.quantity, 10)), 0);
      const insertOrder = await transaction.request()
        .input('order_type', sql.NVarChar(20), order_type)
        .input('provider_id', sql.Int, provider_id || null)
        .input('client_id', sql.Int, client_id || null)
        .input('total_amount', sql.Decimal(18,2), totalAmount)
        .input('delivery_type', sql.NVarChar(50), delivery_type || null)
        .query('INSERT INTO Orders (order_type, provider_id, client_id, total_amount, delivery_type) OUTPUT INSERTED.* VALUES (@order_type,@provider_id,@client_id,@total_amount,@delivery_type)');
      const order = insertOrder.recordset[0];

      // Insert items and update product stock
      for (const it of items) {
        const q = parseInt(it.quantity, 10);
        const unitPrice = parseFloat(it.unit_price || 0) || 0;
        await transaction.request()
          .input('order_id', sql.Int, order.id)
          .input('product_id', sql.Int, it.product_id)
          .input('quantity', sql.Int, q)
          .input('unit_price', sql.Decimal(18,2), unitPrice)
          .query('INSERT INTO OrderItems (order_id, product_id, quantity, unit_price) VALUES (@order_id,@product_id,@quantity,@unit_price)');

        // Update product stock: if supplier order -> stock += q, if client order -> stock -= q
        if (order_type === 'supplier') {
          await transaction.request().input('product_id', sql.Int, it.product_id).input('q', sql.Int, q).query('UPDATE Products SET stock = ISNULL(stock,0) + @q WHERE id = @product_id');
        } else if (order_type === 'client') {
          // check stock
          const prodRes = await transaction.request().input('product_id', sql.Int, it.product_id).query('SELECT stock FROM Products WHERE id = @product_id');
          const currentStock = prodRes.recordset[0]?.stock || 0;
          if (currentStock < q) throw new Error(`Stock insuficiente para el producto ${it.product_id}`);
          await transaction.request().input('product_id', sql.Int, it.product_id).input('q', sql.Int, q).query('UPDATE Products SET stock = stock - @q WHERE id = @product_id');
        }
      }

      await transaction.commit();

      // Return created order details
      const itemsRes = await pool.request().input('order_id', sql.Int, order.id).query('SELECT oi.*, p.name, p.sku FROM OrderItems oi JOIN Products p ON p.id = oi.product_id WHERE oi.order_id = @order_id');
      order.items = itemsRes.recordset;
      res.status(201).json(order);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) { next(err); }
});

module.exports = router;
