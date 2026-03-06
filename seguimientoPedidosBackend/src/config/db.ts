import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE,
  options: {
    encrypt: false, // true solo si es Azure
    trustServerCertificate: true // necesario en local
  }
};

let pool: sql.ConnectionPool;

export const connectDB = async (): Promise<sql.ConnectionPool> => {
  try {
    if (!pool) {
      pool = await new sql.ConnectionPool(config).connect();
      console.log('✅ Conectado a SQL Server');
    }
    return pool;
  } catch (error) {
    console.error('❌ Error conectando a SQL Server:', error);
    throw error;
  }
};

export { sql };