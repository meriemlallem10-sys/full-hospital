// ============================================
// routes/beds.js — BED ROUTES
// ============================================
// Handles everything related to beds:
// - Get all beds (for rooms overview page)
// - Get available beds by department
//   (for patient registration form)
// ============================================

const router = require('express').Router();
const db     = require('../db');


// ============================================
// 1. GET ALL BEDS
// GET /api/beds
// ============================================
// Returns every bed in the hospital with
// department info and who is occupying it.
// Used by: Secretary (rooms page)
// ============================================
router.get('/', async function(req, res) {
  try {

    const [rows] = await db.query(`
      SELECT
        b.id_bed,
        b.roomNUM,
        b.is_occupied,
        d.id_department,
        d.name      AS dept_name,
        p.id_patient,
        p.first_name,
        p.last_name,
        p.status    AS patient_status
      FROM Bed b
      LEFT JOIN Department d ON b.id_department   = d.id_department
      LEFT JOIN Patient    p ON p.id_bed           = b.id_bed
                             AND p.status          = 'admitted'
      ORDER BY b.id_department, b.id_bed
    `);
    // the LEFT JOIN on Patient makes sure we only show
    // the CURRENT admitted patient in that bed,
    // not old discharged patients who were there before

    return res.status(200).json({
      success: true,
      beds:    rows
    });

  } catch (error) {
    console.error('Get beds error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching beds.'
    });
  }
});


// ============================================
// 2. GET AVAILABLE BEDS BY DEPARTMENT
// GET /api/beds/available/:id_department
// ============================================
// Returns only the FREE beds in a specific
// department. Used when registering a patient
// so the secretary can pick an empty bed.
// Used by: Secretary (registration form)
// ============================================
router.get('/available/:id_department', async function(req, res) {
  try {

    const deptId = req.params.id_department;

    const [rows] = await db.query(`
      SELECT
        b.id_bed,
        b.roomNUM,
        d.name AS dept_name
      FROM Bed b
      LEFT JOIN Department d ON b.id_department = d.id_department
      WHERE b.id_department = ?
        AND b.is_occupied   = FALSE
      ORDER BY b.id_bed
    `, [deptId]);
    // is_occupied = FALSE means the bed is empty and available

    return res.status(200).json({
      success: true,
      beds:    rows
    });

  } catch (error) {
    console.error('Get available beds error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching available beds.'
    });
  }
});


// Export the router
module.exports = router;