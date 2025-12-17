const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');
const { auth, requireRole } = require('../middleware/auth');

// GET todos los pedidos con información de clientes
router.get('/', auth, async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        tp.ID_TomaPedido as id,
        'client' as order_type,
        tp.ID_Cliente as client_id,
        c.Nombre + ' ' + ISNULL(c.Apellido, '') as client_name,
        RTRIM(c.Direccion) as client_direccion,
        RTRIM(c.Numero) as client_numero,
        RTRIM(c.Telefono) as client_telefono,
        tp.Fecha as created_at,
        tp.FechaEntrega as delivery_date,
        tp.Total as total_amount,
        tp.Estado as status,
        tp.Dto as discount,
        tp.Observaciones as notes,
        CASE WHEN tp.bDeposito = 1 THEN 'deposito' ELSE 'por reparto' END as delivery_type,
        tp.ID_Repartidor as repartidor_id,
        RTRIM(r.Nombre) + ' ' + RTRIM(ISNULL(r.Apellido, '')) as repartidor_name
      FROM TomadePedido tp
      LEFT JOIN Clientes c ON tp.ID_Cliente = c.ID_Cliente
      LEFT JOIN Repartidores r ON tp.ID_Repartidor = r.ID_Repartidor
      ORDER BY tp.Fecha DESC
    `);
    res.json(result.recordset);
  } catch (err) { next(err); }
});

// GET detalles de un pedido específico
router.get('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    
    const orderRes = await pool.request()
      .input('id', sql.BigInt, id)
      .query(`
        SELECT 
          tp.ID_TomaPedido as id,
          'client' as order_type,
          tp.ID_Cliente as client_id,
          c.Nombre + ' ' + ISNULL(c.Apellido, '') as client_name,
          tp.Fecha as created_at,
          tp.Total as total_amount,
          tp.Estado as status
        FROM TomadePedido tp
        LEFT JOIN Clientes c ON tp.ID_Cliente = c.ID_Cliente
        WHERE tp.ID_TomaPedido = @id
      `);
    
    if (orderRes.recordset.length === 0) return res.status(404).json({ message: 'Pedido no encontrado' });
    
    const order = orderRes.recordset[0];
    
    const itemsRes = await pool.request()
      .input('order_id', sql.BigInt, id)
      .query(`
        SELECT 
          dt.ID_Producto as product_id,
          p.Descripcion as name,
          p.Pr_Ean13 as sku,
          dt.Cantidad as quantity,
          dt.PrecioUnitario as unit_price
        FROM DetalleTomadePedido dt
        LEFT JOIN Productos p ON dt.ID_Producto = p.ID_Producto
        WHERE dt.ID_TomaPedido = @order_id
      `);
    
    order.items = itemsRes.recordset;
    res.json(order);
  } catch (err) { next(err); }
});

// POST crear nuevo pedido
router.post('/', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { client_id, items, delivery_type, delivery_date, repartidor_id } = req.body;
    
    if (!client_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Faltan datos requeridos' });
    }
    
    // Validar que si es "por reparto", se especifique un repartidor
    if (delivery_type === 'por reparto' && !repartidor_id) {
      return res.status(400).json({ message: 'Debe seleccionar un repartidor para entregas por reparto' });
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      let total = 0;
      const itemsWithPrices = [];
      
      for (const it of items) {
        const prodRes = await transaction.request()
          .input('product_id', sql.Int, it.product_id)
          .query('SELECT PrecioFinalUni, Stock FROM Productos WHERE ID_Producto = @product_id');
        
        if (prodRes.recordset.length === 0) throw new Error(`Producto ${it.product_id} no encontrado`);
        
        const product = prodRes.recordset[0];
        const quantity = parseFloat(it.quantity);
        const unitPrice = parseFloat(it.unit_price || product.PrecioFinalUni);
        
        if (product.Stock < quantity) {
          throw new Error(`Stock insuficiente para producto ${it.product_id}`);
        }
        
        const itemTotal = unitPrice * quantity;
        itemsWithPrices.push({ ...it, unitPrice, quantity, itemTotal });
        total += itemTotal;
      }
      
      // Calcular fecha de entrega (por defecto 7 días desde hoy si no se especifica)
      const fechaEntrega = delivery_date 
        ? new Date(delivery_date) 
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      const insertOrder = await transaction.request()
        .input('Letra', sql.NVarChar(30), 'A')
        .input('ID_Comprobante', sql.Int, 1)
        .input('ID_Cliente', sql.Int, client_id)
        .input('Fecha', sql.DateTime, new Date())
        .input('FechaEntrega', sql.DateTime, fechaEntrega)
        .input('Total', sql.Real, total)
        .input('Apagar', sql.Real, total)
        .input('CtaCte', sql.Real, 0)
        .input('Estado', sql.NVarChar(50), 'Pendiente')
        .input('bDeposito', sql.SmallInt, delivery_type === 'deposito' ? 1 : 0)
        .input('ID_Repartidor', sql.Int, repartidor_id || null)
        .query(`
          INSERT INTO TomadePedido (
            Letra, ID_Comprobante, ID_Cliente, Fecha, FechaEntrega, Dto, Total, 
            Apagar, CtaCte, Estado, bDeposito, ID_Repartidor
          )
          OUTPUT INSERTED.ID_TomaPedido
          VALUES (
            @Letra, @ID_Comprobante, @ID_Cliente, @Fecha, @FechaEntrega, 0, @Total,
            @Apagar, @CtaCte, @Estado, @bDeposito, @ID_Repartidor
          )
        `);
      
      const orderId = insertOrder.recordset[0].ID_TomaPedido;
      
      let itemNumber = 1;
      for (const it of itemsWithPrices) {
        await transaction.request()
          .input('ID_TomaPedido', sql.BigInt, orderId)
          .input('ID_Producto', sql.Int, it.product_id)
          .input('IVA', sql.Real, it.itemTotal * 0.21)
          .input('PrecioUnitario', sql.Real, it.unitPrice)
          .input('Cantidad', sql.Real, it.quantity)
          .input('ImporteconDto', sql.Real, it.itemTotal)
          .input('Item', sql.NVarChar(2), itemNumber.toString().padStart(2, '0'))
          .query(`
            INSERT INTO DetalleTomadePedido (
              ID_TomaPedido, ID_Producto, IVA, PrecioUnitario, Cantidad,
              RestoIVA, Dto, ImporteconDto, Item
            ) VALUES (
              @ID_TomaPedido, @ID_Producto, @IVA, @PrecioUnitario, @Cantidad,
              0, 0, @ImporteconDto, @Item
            )
          `);
        
        await transaction.request()
          .input('product_id', sql.Int, it.product_id)
          .input('quantity', sql.Real, it.quantity)
          .query('UPDATE Productos SET Stock = Stock - @quantity WHERE ID_Producto = @product_id');
        
        itemNumber++;
      }
      
      await transaction.commit();
      
      res.status(201).json({ id: orderId, total_amount: total, status: 'Pendiente' });
      
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) { next(err); }
});

// PUT actualizar pedido existente
router.put('/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { client_id, items, delivery_type, delivery_date, repartidor_id, status } = req.body;
    
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      // Si solo se actualiza el estado (marcar como entregado)
      if (status && !items) {
        await transaction.request()
          .input('id', sql.BigInt, id)
          .input('status', sql.NVarChar(50), status)
          .query('UPDATE TomadePedido SET Estado = @status WHERE ID_TomaPedido = @id');
        
        await transaction.commit();
        return res.json({ id: parseInt(id), status });
      }
      
      // Actualización completa del pedido
      if (!client_id || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Faltan datos requeridos' });
      }
      
      // Validar repartidor si es necesario
      if (delivery_type === 'por reparto' && !repartidor_id) {
        return res.status(400).json({ message: 'Debe seleccionar un repartidor para entregas por reparto' });
      }

      // Restaurar stock de productos anteriores
      const oldItemsRes = await transaction.request()
        .input('order_id', sql.BigInt, id)
        .query('SELECT ID_Producto, Cantidad FROM DetalleTomadePedido WHERE ID_TomaPedido = @order_id');
      
      for (const oldItem of oldItemsRes.recordset) {
        await transaction.request()
          .input('product_id', sql.Int, oldItem.ID_Producto)
          .input('quantity', sql.Real, oldItem.Cantidad)
          .query('UPDATE Productos SET Stock = Stock + @quantity WHERE ID_Producto = @product_id');
      }
      
      // Eliminar items anteriores
      await transaction.request()
        .input('order_id', sql.BigInt, id)
        .query('DELETE FROM DetalleTomadePedido WHERE ID_TomaPedido = @order_id');
      
      // Calcular nuevo total y agregar items
      let total = 0;
      const itemsWithPrices = [];
      
      for (const it of items) {
        const prodRes = await transaction.request()
          .input('product_id', sql.Int, it.product_id)
          .query('SELECT PrecioFinalUni, Stock FROM Productos WHERE ID_Producto = @product_id');
        
        if (prodRes.recordset.length === 0) throw new Error(`Producto ${it.product_id} no encontrado`);
        
        const product = prodRes.recordset[0];
        const quantity = parseFloat(it.quantity);
        const unitPrice = parseFloat(it.unit_price || product.PrecioFinalUni);
        
        if (product.Stock < quantity) {
          throw new Error(`Stock insuficiente para producto ${it.product_id}`);
        }
        
        const itemTotal = unitPrice * quantity;
        itemsWithPrices.push({ ...it, unitPrice, quantity, itemTotal });
        total += itemTotal;
      }
      
      // Actualizar pedido
      const fechaEntrega = delivery_date 
        ? new Date(delivery_date) 
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      await transaction.request()
        .input('id', sql.BigInt, id)
        .input('ID_Cliente', sql.Int, client_id)
        .input('FechaEntrega', sql.DateTime, fechaEntrega)
        .input('Total', sql.Real, total)
        .input('Apagar', sql.Real, total)
        .input('bDeposito', sql.SmallInt, delivery_type === 'deposito' ? 1 : 0)
        .input('ID_Repartidor', sql.Int, repartidor_id || null)
        .query(`
          UPDATE TomadePedido 
          SET ID_Cliente = @ID_Cliente,
              FechaEntrega = @FechaEntrega,
              Total = @Total,
              Apagar = @Apagar,
              bDeposito = @bDeposito,
              ID_Repartidor = @ID_Repartidor
          WHERE ID_TomaPedido = @id
        `);
      
      // Insertar nuevos items
      let itemNumber = 1;
      for (const it of itemsWithPrices) {
        await transaction.request()
          .input('ID_TomaPedido', sql.BigInt, id)
          .input('ID_Producto', sql.Int, it.product_id)
          .input('IVA', sql.Real, it.itemTotal * 0.21)
          .input('PrecioUnitario', sql.Real, it.unitPrice)
          .input('Cantidad', sql.Real, it.quantity)
          .input('ImporteconDto', sql.Real, it.itemTotal)
          .input('Item', sql.NVarChar(2), itemNumber.toString().padStart(2, '0'))
          .query(`
            INSERT INTO DetalleTomadePedido (
              ID_TomaPedido, ID_Producto, IVA, PrecioUnitario, Cantidad,
              RestoIVA, Dto, ImporteconDto, Item
            ) VALUES (
              @ID_TomaPedido, @ID_Producto, @IVA, @PrecioUnitario, @Cantidad,
              0, 0, @ImporteconDto, @Item
            )
          `);
        
        // Descontar stock
        await transaction.request()
          .input('product_id', sql.Int, it.product_id)
          .input('quantity', sql.Real, it.quantity)
          .query('UPDATE Productos SET Stock = Stock - @quantity WHERE ID_Producto = @product_id');
        
        itemNumber++;
      }
      
      await transaction.commit();
      
      res.json({ id: parseInt(id), total_amount: total, status: 'Pendiente' });
      
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) { next(err); }
});

module.exports = router;
