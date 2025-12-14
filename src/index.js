const app = require('./app');
const { poolPromise } = require('./db');
const port = process.env.PORT || 3002;

(async () => {
  try {
    // Wait for DB connection before starting the server
    const pool = await poolPromise;
    // Seed default permissions and users when starting the server
    try { const seed = require('./seedUsers'); await seed(); } catch (err) { console.warn('Seed users failed', err); }

    const server = app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`Received ${signal}. Closing server and DB pool...`);
      if (server && server.close) {
        server.close(() => console.log('HTTP server closed.'));
      }
      try {
        await pool.close();
        console.log('DB pool closed.');
      } catch (err) {
        console.error('Error closing DB pool:', err);
      }
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('uncaughtException', (err) => {
      console.error('Uncaught exception:', err);
      shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled rejection:', reason);
      shutdown('unhandledRejection');
    });
  } catch (err) {
    console.error('Failed to start server, database connection failed:', err);
    process.exit(1);
  }
})();
