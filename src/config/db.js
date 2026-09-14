const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'StudentAssignmentDB',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 15000,
  requestTimeout: 15000,
};

if (process.env.DB_INSTANCE) {
  config.options.instanceName = process.env.DB_INSTANCE;
} else if (process.env.DB_PORT) {
  config.port = parseInt(process.env.DB_PORT, 10);
}

let pool = null;

async function getPool() {
  if (!pool) {
    try {
      pool = await new sql.ConnectionPool(config).connect();
      console.log('✅ Kết nối thành công đến Microsoft SQL Server:', config.server, 'Database:', config.database);
      
      pool.on('error', (err) => {
        console.error('❌ Lỗi SQL Server Pool:', err.message);
        pool = null;
      });
    } catch (err) {
      console.error('❌ Không thể kết nối tới SQL Server:', err.message);
      console.error('👉 Vui lòng kiểm tra lại cấu hình tài khoản, mật khẩu, cổng kết nối trong file .env');
      throw err;
    }
  }
  return pool;
}

module.exports = {
  sql,
  getPool,
  config,
};
