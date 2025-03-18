// src/config/db.js


const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,        // e.g. 'localhost'
  user: process.env.DB_USER,        // e.g. 'root'
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE, // e.g. 'DirectorHiringDB'
  waitForConnections: true,
  connectionLimit: 10,              // adjust as needed
  queueLimit: 0
});



async function connectDB() {
  try {
    // Test a simple connection to verify config
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    console.log('Connected to MySQL! Test query result:', rows[0].result);
    return pool;
  } catch (err) {
    console.error('MySQL Connection Failed!', err);
    throw err;
  }
}

module.exports = {
  pool,
  connectDB
};
