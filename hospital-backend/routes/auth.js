// ============================================
// routes/auth.js — LOGIN & AUTHENTICATION
// ============================================
// This file handles ONE thing: logging in.
//
// When the frontend sends a POST to /api/auth/login
// we check the database and respond with either:
// - the user's info (if credentials are correct)
// - an error message (if wrong)
// ============================================

// Express Router lets us define routes in a
// separate file instead of putting everything
// in server.js
const router = require('express').Router();

// Import our database connection
const db = require('../db');
// The ../ means "go up one folder" (from routes/ to hospital-backend/)

// ============================================
// POST /api/auth/login
// ============================================
// This route runs when the frontend sends:
// POST http://localhost:3000/api/auth/login
// with body: { username, password, role }
// ============================================
router.post('/login', async function(req, res) {
  // ── STEP 1: Read the data the frontend sent ──
  const username = req.body.username;
  const password = req.body.password;
  const role     = req.body.role;

  // ── STEP 2: Basic validation ──
  // Make sure all 3 fields were actually sent
  if (!username || !password || !role) {
    // 400 = "Bad Request" — frontend sent incomplete data
    return res.status(400).json({
      success: false,
      message: 'Username, password and role are required.'
    });
  }

  // ── STEP 3: Search the correct table ──
  // Each role is stored in a different table.
  // We need to know WHICH table to search.
  //
  // What is a try/catch?
  // try   = attempt to run this code
  // catch = if anything goes wrong, run this instead
  // This prevents our server from crashing on errors.

  try {

    let user = null; // will hold the found user
    let userData = null; // will hold the final response object

    // ── STEP 4: Check which role was sent ──
    if (role === 'admin') {

      // Search the Admin table
      // db.query() sends a SQL query to MySQL
      // It returns an array: [rows, fields]
      // rows = the actual results (array of matching rows)
      const [rows] = await db.query(
        'SELECT * FROM Admin WHERE username = ? AND password = ?',
        [username, password]
        // The ? marks are placeholders — mysql2 fills them in safely
        // This protects against SQL injection attacks
      );

      // rows[0] = the first (and should be only) matching row
      // If nothing was found, rows[0] is undefined
      if (rows[0]) {
        user = rows[0];
        userData = {
          id:       user.id_admin,
          name:     user.name,
          username: user.username,
          role:     'admin',
          wing:     '-'  // admin has no department
        };
      }

    } else if (role === 'secretary') {

      const [rows] = await db.query(
        'SELECT * FROM Secretary WHERE username = ? AND password = ?',
        [username, password]
      );

      if (rows[0]) {
        user = rows[0];
        userData = {
          id:       user.id_secretary,
          name:     user.name,
          username: user.username,
          role:     'secretary',
          wing:     '-'
        };
      }

    } else if (role === 'doctor') {

      // For doctor we also get the department name
      // JOIN = combine two tables in one query
      // Here we join Doctor with Department to get the dept name
      const [rows] = await db.query(
        `SELECT d.*, dep.name AS dept_name
         FROM Doctor d
         LEFT JOIN Department dep ON d.id_department = dep.id_department
         WHERE d.username = ? AND d.password = ?`,
        [username, password]
      );

      if (rows[0]) {
        user = rows[0];
        userData = {
          id:             user.id_doctor,
          name:           user.name,
          username:       user.username,
          role:           'doctor',
          specialization: user.specialization,
          dept_name:      user.dept_name,
          id_department:  user.id_department,
          // wing = department letter used by frontend (A, B, C...)
          // We calculate it from the department id
          wing: getDeptLetter(user.id_department)
        };
      }

    } else if (role === 'nurse') {

      const [rows] = await db.query(
        `SELECT n.*, dep.name AS dept_name
         FROM Nurse n
         LEFT JOIN Department dep ON n.id_department = dep.id_department
         WHERE n.username = ? AND n.password = ?`,
        [username, password]
      );

      if (rows[0]) {
        user = rows[0];
        userData = {
          id:            user.id_nurse,
          name:          user.name,
          username:      user.username,
          role:          'nurse',
          dept_name:     user.dept_name,
          id_department: user.id_department,
          wing:          getDeptLetter(user.id_department)
        };
      }

    } else {
      // Role sent doesn't match any known role
      return res.status(400).json({
        success: false,
        message: 'Invalid role.'
      });
    }

    // ── STEP 5: Send response ──
    if (!userData) {
      // User not found in database
      // 401 = "Unauthorized" — wrong credentials
      return res.status(401).json({
        success: false,
        message: 'Incorrect username or password.'
      });
    }

    // User found! Send back their info.
    // 200 = "OK" — everything went well
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user:    userData
    });

  } catch (error) {
    // Something went wrong with the database
    // 500 = "Internal Server Error"
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
});


// ============================================
// HELPER FUNCTION: getDeptLetter
// ============================================
// The frontend uses letters (A, B, C...) for departments
// Our database uses numbers (1, 2, 3...)
// This function converts number → letter
// so the frontend works exactly as before
// ============================================
function getDeptLetter(id_department) {
  const map = {
    1: 'A',  // General Medicine
    2: 'B',  // Cardiology
    3: 'C',  // Pediatrics
    4: 'D',  // Orthopedics
    5: 'E',  // Neurology
    6: 'F'   // Maternity
  };
  return map[id_department] || '-';
}


// Export this router so server.js can use it
module.exports = router;