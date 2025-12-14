const sql = require('mssql');

// Server value can be either 'host' or 'host\\INSTANCE'.
const serverEnv = process.env.DB_SERVER || 'localhost';
let server = serverEnv;
let instanceName;
if (serverEnv.includes('\\')) {
  const parts = serverEnv.split('\\');
  server = parts[0];
  instanceName = parts.slice(1).join('\\');
}

const port = instanceName ? undefined : parseInt(process.env.DB_PORT || '1433', 10);
//const port = parseInt(process.env.DB_PORT || '1433', 10);
const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Apex34',
  server,
  database: process.env.DB_DATABASE || 'OMMISYS',
  port,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    ...(instanceName ? { instanceName } : {})
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};
console.log('Database configuration:', config);
const poolPromise = new sql.ConnectionPool(config).connect().then(pool => {
  console.log('Connected to SQL Server');
  return pool;
}).catch(err => {
  console.error('Database Connection Failed! Bad Config: ', err);
  throw err;
});

module.exports = { sql, poolPromise };
