// ============================================
// db.js — DATABASE CONNECTION FILE
// ============================================
// This file connects our Node.js backend
// to the MySQL database running in XAMPP.
//
// Think of this file as a "phone line" between
// our backend and the database.
// Every other file will import and use this.
// ============================================

// Import the mysql2 library we installed
const mysql = require('mysql2');

// Import dotenv so we can read the .env file
require('dotenv').config();

// Create a connection POOL
// ─────────────────────────────────────────────
// What is a pool? 
// Instead of opening and closing one connection
// every time we need the database, a pool keeps
// several connections open and ready to use.
// This is faster and safer.
const pool = mysql.createPool({
  host:     process.env.DB_HOST,      // reads 'localhost' from .env
  user:     process.env.DB_USER,      // reads 'root' from .env
  password: process.env.DB_PASSWORD,  // reads '' from .env
  database: process.env.DB_NAME,      // reads 'hospital_db' from .env

  waitForConnections: true,  // if all connections are busy, wait
  connectionLimit:    10,    // maximum 10 connections at the same time
  queueLimit:         0      // no limit on waiting requests
});

// Add .promise() so we can use modern async/await syntax
// Without this, we would need old "callback" style code
// which is much harder to read
const db = pool.promise();

// Export db so any other file can do:
// const db = require('./db')
// and use the same database connection
module.exports = db;