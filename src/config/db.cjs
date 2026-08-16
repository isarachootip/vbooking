const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const isSSL = connectionString 
  ? (connectionString.includes('neon') || connectionString.includes('sslmode=require') || process.env.DB_SSL === 'true')
  : (process.env.DB_SSL === 'true');

const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: isSSL ? { rejectUnauthorized: false } : false
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres_password_123',
        database: process.env.DB_NAME || 'buildflowdb',
        ssl: isSSL ? { rejectUnauthorized: false } : false
      }
);

module.exports = pool;
