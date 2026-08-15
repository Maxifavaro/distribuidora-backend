const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../db');
const { auth } = require('../middleware/auth');

// Get all active sections (menu items) based on user permission
router.get('/', auth, async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const query = `
      SELECT 
        ID_Section as id,
        RTRIM(section_name) as name,
        RTRIM(section_key) as [key],
        RTRIM(table_name) as table_name,
        RTRIM(api_endpoint) as api_endpoint,
        display_order,
        is_active,
        requires_admin
      FROM system_structure
      WHERE is_active = 1
        AND (requires_admin = 0 OR @permission = 'admin')
      ORDER BY display_order
    `;
    
    const result = await pool.request()
      .input('permission', sql.NVarChar, req.user.permission)
      .query(query);
    
    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

// Get table structure (columns, types, length) for dynamic form/grid generation
router.get('/table-structure/:tableName', async (req, res, next) => {
  try {
    const pool = await poolPromise;
    const tableName = req.params.tableName;
    
    // Validate table name to prevent SQL injection
    const validTableQuery = `
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = @tableName AND TABLE_SCHEMA = 'dbo'
    `;
    
    const tableValidation = await pool.request()
      .input('tableName', sql.NVarChar(100), tableName)
      .query(validTableQuery);
    
    if (tableValidation.recordset.length === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    // Get column information
    const columnsQuery = `
      SELECT 
        COLUMN_NAME as name,
        DATA_TYPE as dataType,
        CHARACTER_MAXIMUM_LENGTH as maxLength,
        IS_NULLABLE as isNullable,
        COLUMNPROPERTY(OBJECT_ID(@tableName), COLUMN_NAME, 'IsIdentity') as isIdentity,
        CASE 
          WHEN COLUMNPROPERTY(OBJECT_ID(@tableName), COLUMN_NAME, 'IsComputed') = 1 THEN 1
          ELSE 0
        END as isComputed
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @tableName AND TABLE_SCHEMA = 'dbo'
      ORDER BY ORDINAL_POSITION
    `;
    
    const columnsResult = await pool.request()
      .input('tableName', sql.NVarChar(100), tableName)
      .query(columnsQuery);
    
    // Get primary key
    const pkQuery = `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE OBJECTPROPERTY(OBJECT_ID(CONSTRAINT_SCHEMA + '.' + CONSTRAINT_NAME), 'IsPrimaryKey') = 1
        AND TABLE_NAME = @tableName
    `;
    
    const pkResult = await pool.request()
      .input('tableName', sql.NVarChar(100), tableName)
      .query(pkQuery);
    
    const primaryKey = pkResult.recordset.length > 0 ? pkResult.recordset[0].COLUMN_NAME : null;
    
    // Process columns to make them frontend-friendly
    const columns = columnsResult.recordset.map(col => ({
      name: col.name,
      dataType: col.dataType,
      maxLength: col.maxLength,
      isNullable: col.isNullable === 'YES',
      isIdentity: col.isIdentity === 1,
      isComputed: col.isComputed === 1,
      isPrimaryKey: col.name === primaryKey,
      fieldType: getFieldType(col.dataType),
      readOnly: col.isIdentity === 1 || col.isComputed === 1
    }));
    
    res.json({
      tableName,
      primaryKey,
      columns
    });
  } catch (err) {
    next(err);
  }
});

// Helper function to determine frontend field type based on SQL data type
function getFieldType(sqlDataType) {
  const type = sqlDataType.toLowerCase();
  
  if (type.includes('int')) return 'number';
  if (type.includes('bit')) return 'boolean';
  if (type.includes('date') || type.includes('time')) return 'datetime';
  if (type.includes('decimal') || type.includes('float')) return 'decimal';
  if (type.includes('char') || type.includes('text')) return 'text';
  
  return 'text'; // default
}

module.exports = router;
