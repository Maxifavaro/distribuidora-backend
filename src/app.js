require('dotenv').config();
const express = require('express');
const app = express();

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

app.use('/auth', authRouter);
app.use('/providers', providersRouter);
app.use('/clients', clientsRouter);
app.use('/products', productsRouter);
app.use('/orders', ordersRouter);
app.use('/users', usersRouter);
app.use('/statistics', statisticsRouter);
app.use('/rubros', rubrosRouter);
app.use('/catalogs', catalogsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
