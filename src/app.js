require('dotenv').config();
const express = require('express');
const app = express();

// Enable CORS for frontend (Vite and other origins)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

const providersRouter = require('./routes/providers');
const clientsRouter = require('./routes/clients');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const statisticsRouter = require('./routes/statistics');
const rubrosRouter = require('./routes/rubros');
const catalogsRouter = require('./routes/catalogs');
const repartidoresRouter = require('./routes/repartidores');
const marcasRouter = require('./routes/marcas');
const systemStructureRouter = require('./routes/system-structure');
const dynamicRouter = require('./routes/dynamic');

app.use('/auth', authRouter);
app.use('/system-structure', systemStructureRouter);
app.use('/dynamic', dynamicRouter);
app.use('/providers', providersRouter);
app.use('/clients', clientsRouter);
app.use('/products', productsRouter);
app.use('/orders', ordersRouter);
app.use('/users', usersRouter);
app.use('/statistics', statisticsRouter);
app.use('/rubros', rubrosRouter);
app.use('/catalogs', catalogsRouter);
app.use('/repartidores', repartidoresRouter);
app.use('/marcas', marcasRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
