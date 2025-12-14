const bcrypt = require('bcrypt');
const { poolPromise } = require('./db');

async function seed() {
  try {
    const pool = await poolPromise;

    // seed users if not exist
    const users = [
      { username: 'maxi', password: 'admin123', permission: 'admin' },
      { username: 'cacho', password: 'read123', permission: 'read' }
    ];
    for (const u of users) {
      const r = await pool.request().input('username', u.username).query('SELECT id FROM Users WHERE username = @username');
      if (r.recordset.length === 0) {
        const hash = await bcrypt.hash(u.password, 10);
        await pool.request()
          .input('username', u.username)
          .input('password', hash)
          .input('permission', u.permission)
          .query('INSERT INTO Users (username, password, permission) VALUES (@username, @password, @permission)');
      }
    }

    console.log('Seeded permissions and users');
  } catch (err) {
    console.error('Error seeding users', err);
  }
}

module.exports = seed;
