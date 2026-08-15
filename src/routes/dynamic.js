const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');
const { auth, requireRole } = require('../middleware/auth');

// Validate table name exists in the database schema (prevents SQL injection via identifiers)
async function validateTable(pool, tableName) {
  const result = await pool.request()
    .input('tableName', sql.NVarChar(100), tableName)
    .query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = @tableName AND TABLE_SCHEMA = 'dbo'`);
  return result.recordset.length > 0;
}

// Get real column names + primary key for a table
async function getTableMeta(pool, tableName) {
  const columnsResult = await pool.request()
    .input('tableName', sql.NVarChar(100), tableName)
    .query(`
      SELECT COLUMN_NAME as name, DATA_TYPE as dataType,
        COLUMNPROPERTY(OBJECT_ID(@tableName), COLUMN_NAME, 'IsIdentity') as isIdentity,
        COLUMNPROPERTY(OBJECT_ID(@tableName), COLUMN_NAME, 'IsComputed') as isComputed
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @tableName AND TABLE_SCHEMA = 'dbo'
      ORDER BY ORDINAL_POSITION
    `);

  const pkResult = await pool.request()
    .input('tableName', sql.NVarChar(100), tableName)
    .query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_SCHEMA + '.' + CONSTRAINT_NAME), 'IsPrimaryKey') = 1
        AND TABLE_NAME = @tableName
    `);

  const primaryKey = pkResult.recordset.length > 0 ? pkResult.recordset[0].COLUMN_NAME : null;
  return { columns: columnsResult.recordset, primaryKey };
}

function mapSqlType(dataType) {
  const type = (dataType || '').toLowerCase();
  if (type.includes('int')) return sql.Int;
  if (type.includes('bit')) return sql.Bit;
  if (type.includes('decimal') || type.includes('numeric')) return sql.Decimal(18, 2);
  if (type.includes('float')) return sql.Float;
  if (type.includes('datetime')) return sql.DateTime;
  if (type.includes('date')) return sql.Date;
  return sql.NVarChar(sql.MAX);
}

// GET /dynamic/:tableName - list all rows (raw column names, RTRIM applied to strings)
router.get('/:tableName', auth, async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const { tableName } = req.params;
    if (!(await validateTable(pool, tableName))) {
      return res.status(404).json({ error: 'Table not found' });
    }
    const { columns } = await getTableMeta(pool, tableName);
    const selectCols = columns.map(c => {
      const isString = ['char', 'varchar', 'nchar', 'nvarchar', 'text'].some(t => c.dataType.toLowerCase().includes(t));
      return isString ? `RTRIM([${c.name}]) as [${c.name}]` : `[${c.name}]`;
    }).join(', ');

    const result = await pool.request().query(`SELECT ${selectCols} FROM [dbo].[${tableName}]`);
    res.json(result.recordset);
  } catch (err) { next(err); }
});

// POST /dynamic/:tableName - create a row
router.post('/:tableName', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const { tableName } = req.params;
    if (!(await validateTable(pool, tableName))) {
      return res.status(404).json({ error: 'Table not found' });
    }
    const { columns, primaryKey } = await getTableMeta(pool, tableName);
    const writableColumns = columns.filter(c => c.isIdentity !== 1 && c.isComputed !== 1 && Object.prototype.hasOwnProperty.call(req.body, c.name));

    if (writableColumns.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }

    const request = pool.request();
    writableColumns.forEach(c => {
      request.input(c.name, mapSqlType(c.dataType), req.body[c.name] === '' ? null : req.body[c.name]);
    });

    const colNames = writableColumns.map(c => `[${c.name}]`).join(', ');
    const colParams = writableColumns.map(c => `@${c.name}`).join(', ');
    const outputClause = primaryKey ? `OUTPUT INSERTED.*` : '';

    const result = await request.query(`
      INSERT INTO [dbo].[${tableName}] (${colNames}) ${outputClause}
      VALUES (${colParams})
    `);

    res.status(201).json(result.recordset ? result.recordset[0] : {});
  } catch (err) { next(err); }
});

// PUT /dynamic/:tableName/:id - update a row
router.put('/:tableName/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const { tableName, id } = req.params;
    if (!(await validateTable(pool, tableName))) {
      return res.status(404).json({ error: 'Table not found' });
    }
    const { columns, primaryKey } = await getTableMeta(pool, tableName);
    if (!primaryKey) {
      return res.status(400).json({ error: 'Table has no primary key' });
    }
    const writableColumns = columns.filter(c => c.isIdentity !== 1 && c.isComputed !== 1 && c.name !== primaryKey && Object.prototype.hasOwnProperty.call(req.body, c.name));

    if (writableColumns.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }

    const pkColumn = columns.find(c => c.name === primaryKey);
    const request = pool.request();
    request.input('__pk', mapSqlType(pkColumn.dataType), id);
    writableColumns.forEach(c => {
      request.input(c.name, mapSqlType(c.dataType), req.body[c.name] === '' ? null : req.body[c.name]);
    });

    const setClause = writableColumns.map(c => `[${c.name}] = @${c.name}`).join(', ');

    await request.query(`
      UPDATE [dbo].[${tableName}]
      SET ${setClause}
      WHERE [${primaryKey}] = @__pk
    `);

    res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /dynamic/:tableName/:id - delete a row
router.delete('/:tableName/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const { tableName, id } = req.params;
    if (!(await validateTable(pool, tableName))) {
      return res.status(404).json({ error: 'Table not found' });
    }
    const { columns, primaryKey } = await getTableMeta(pool, tableName);
    if (!primaryKey) {
      return res.status(400).json({ error: 'Table has no primary key' });
    }
    const pkColumn = columns.find(c => c.name === primaryKey);

    await pool.request()
      .input('__pk', mapSqlType(pkColumn.dataType), id)
      .query(`DELETE FROM [dbo].[${tableName}] WHERE [${primaryKey}] = @__pk`);

    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
