// ============================================
// routes/staff.js — STAFF ROUTES
// ============================================
// Handles everything related to staff accounts.
// - Get all staff (doctors, nurses, secretaries)
// - Create new staff account
// - Edit staff account
// - Delete staff account
// - Get hospital statistics
// All used by: Admin only
// ============================================

const router = require('express').Router();
const db     = require('../db');


// ============================================
// 1. GET ALL STAFF
// GET /api/staff
// ============================================
// Returns all staff members from all tables
// (Doctor, Nurse, Secretary, Admin)
// combined into one list.
// Used by: Admin (staff management page)
// ============================================
router.get('/', async function(req, res) {
  try {

    // Get all doctors with their department
    const [doctors] = await db.query(`
      SELECT
        d.id_doctor     AS id,
        d.name,
        d.username,
        d.phoneNbr      AS phone,
        d.role,
        d.specialization,
        dep.name        AS dept_name,
        dep.id_department
      FROM Doctor d
      LEFT JOIN Department dep ON d.id_department = dep.id_department
      ORDER BY d.name
    `);

    // Get all nurses with their department
    const [nurses] = await db.query(`
      SELECT
        n.id_nurse      AS id,
        n.name,
        n.username,
        n.phoneNbr      AS phone,
        n.role,
        dep.name        AS dept_name,
        dep.id_department
      FROM Nurse n
      LEFT JOIN Department dep ON n.id_department = dep.id_department
      ORDER BY n.name
    `);

    // Get all secretaries
    const [secretaries] = await db.query(`
      SELECT
        s.id_secretary  AS id,
        s.name,
        s.username,
        s.phoneNbr      AS phone,
        s.role
      FROM Secretary s
      ORDER BY s.name
    `);

    // Get all admins
    const [admins] = await db.query(`
      SELECT
        a.id_admin      AS id,
        a.name,
        a.username,
        a.phoneNbr      AS phone,
        a.role
      FROM Admin a
      ORDER BY a.name
    `);

    // Combine all staff into one array
    // We add a "type" field so the frontend knows
    // which table each person came from
    const allStaff = [
      ...doctors.map(d    => ({ ...d, type: 'doctor' })),
      ...nurses.map(n     => ({ ...n, type: 'nurse' })),
      ...secretaries.map(s => ({ ...s, type: 'secretary' })),
      ...admins.map(a     => ({ ...a, type: 'admin' }))
    ];

    return res.status(200).json({
      success: true,
      staff:   allStaff
    });

  } catch (error) {
    console.error('Get staff error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching staff.'
    });
  }
});


// ============================================
// 2. GET HOSPITAL STATISTICS
// GET /api/staff/stats
// ============================================
// Returns numbers the admin sees on the
// statistics dashboard:
// - Total doctors, nurses, secretaries
// - Total patients, admitted, discharged
// - Beds occupied per department
// Used by: Admin (statistics page)
// ============================================
router.get('/stats', async function(req, res) {
  try {

    // Count doctors
    const [[{ total_doctors }]] = await db.query(
      'SELECT COUNT(*) AS total_doctors FROM Doctor'
    );

    // Count nurses
    const [[{ total_nurses }]] = await db.query(
      'SELECT COUNT(*) AS total_nurses FROM Nurse'
    );

    // Count secretaries
    const [[{ total_secretaries }]] = await db.query(
      'SELECT COUNT(*) AS total_secretaries FROM Secretary'
    );

    // Count all patients
    const [[{ total_patients }]] = await db.query(
      'SELECT COUNT(*) AS total_patients FROM Patient'
    );

    // Count admitted patients
    const [[{ total_admitted }]] = await db.query(
      "SELECT COUNT(*) AS total_admitted FROM Patient WHERE LOWER(status) = 'admitted'"
    );

    // Count discharged patients
    const [[{ total_discharged }]] = await db.query(
      "SELECT COUNT(*) AS total_discharged FROM Patient WHERE LOWER(status) = 'discharged'"
    );

    // Count total beds and occupied beds per department
    const [bedStats] = await db.query(`
      SELECT
        dep.id_department,
        dep.name          AS dept_name,
        COUNT(b.id_bed)   AS total_beds,
        SUM(b.is_occupied) AS occupied_beds
      FROM Department dep
      LEFT JOIN Bed b ON dep.id_department = b.id_department
      GROUP BY dep.id_department, dep.name
      ORDER BY dep.id_department
    `);
    // GROUP BY = group all beds by department
    // COUNT = count total beds in each department
    // SUM(is_occupied) = count how many are TRUE (1) = occupied

    return res.status(200).json({
      success: true,
      stats: {
        total_doctors,
        total_nurses,
        total_secretaries,
        total_patients,
        total_admitted,
        total_discharged,
        bed_stats: bedStats
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics.'
    });
  }
});


// ============================================
// 3. CREATE NEW STAFF ACCOUNT
// POST /api/staff
// ============================================
// Admin creates a new doctor, nurse,
// secretary or admin account.
// Used by: Admin (create account)
// ============================================
router.post('/', async function(req, res) {
  try {

    const {
      name,
      username,
      password,
      phoneNbr,
      role,
      specialization,
      id_department
    } = req.body;

    // ── Validate required fields ──
    if (!name || !username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, username, password and role are required.'
      });
    }

    // ── Check username is not already taken ──
    // We need to check ALL tables because usernames
    // must be unique across the whole system
    const [existingDoc] = await db.query(
      'SELECT id_doctor FROM Doctor WHERE username = ?',
      [username]
    );
    const [existingNur] = await db.query(
      'SELECT id_nurse FROM Nurse WHERE username = ?',
      [username]
    );
    const [existingSec] = await db.query(
      'SELECT id_secretary FROM Secretary WHERE username = ?',
      [username]
    );
    const [existingAdm] = await db.query(
      'SELECT id_admin FROM Admin WHERE username = ?',
      [username]
    );

    if (existingDoc[0] || existingNur[0] || existingSec[0] || existingAdm[0]) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists.'
      });
    }

    // ── Insert into the correct table based on role ──
    let insertId = null;

    if (role === 'doctor') {

      if (!id_department) {
        return res.status(400).json({
          success: false,
          message: 'Department is required for doctors.'
        });
      }

      const [result] = await db.query(`
        INSERT INTO Doctor
          (name, username, password, phoneNbr, role, specialization, id_department)
        VALUES (?, ?, ?, ?, 'doctor', ?, ?)
      `, [name, username, password, phoneNbr || null, specialization || null, id_department]);

      insertId = result.insertId;

    } else if (role === 'nurse') {

      if (!id_department) {
        return res.status(400).json({
          success: false,
          message: 'Department is required for nurses.'
        });
      }

      const [result] = await db.query(`
        INSERT INTO Nurse
          (name, username, password, phoneNbr, role, id_department)
        VALUES (?, ?, ?, ?, 'nurse', ?)
      `, [name, username, password, phoneNbr || null, id_department]);

      insertId = result.insertId;

    } else if (role === 'secretary') {

      const [result] = await db.query(`
        INSERT INTO Secretary
          (name, username, password, phoneNbr, role)
        VALUES (?, ?, ?, ?, 'secretary')
      `, [name, username, password, phoneNbr || null]);

      insertId = result.insertId;

    } else if (role === 'admin') {

      const [result] = await db.query(`
        INSERT INTO Admin
          (name, username, password, phoneNbr, role)
        VALUES (?, ?, ?, ?, 'admin')
      `, [name, username, password, phoneNbr || null]);

      insertId = result.insertId;

    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be doctor, nurse, secretary or admin.'
      });
    }

    return res.status(201).json({
      success: true,
      message: `${role} account created successfully.`,
      id:      insertId
    });

  } catch (error) {
    console.error('Create staff error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating staff account.'
    });
  }
});


// ============================================
// 4. EDIT STAFF ACCOUNT
// PUT /api/staff/:role/:id
// ============================================
// Admin updates phone number or password
// of a staff member.
// Used by: Admin (edit account)
// ============================================
router.put('/:role/:id', async function(req, res) {
  try {

    const role = req.params.role;
    const id   = req.params.id;
    const { phoneNbr, password } = req.body;

    if (!phoneNbr) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required.'
      });
    }

    // ── Update the correct table based on role ──
    if (role === 'doctor') {

      await db.query(`
        UPDATE Doctor SET
          phoneNbr = ?,
          password = COALESCE(NULLIF(?, ''), password)
        WHERE id_doctor = ?
      `, [phoneNbr, password || '', id]);
      // COALESCE(NULLIF(?, ''), password) means:
      // if password sent is empty string → keep the old password
      // if password sent has a value → update it

    } else if (role === 'nurse') {

      await db.query(`
        UPDATE Nurse SET
          phoneNbr = ?,
          password = COALESCE(NULLIF(?, ''), password)
        WHERE id_nurse = ?
      `, [phoneNbr, password || '', id]);

    } else if (role === 'secretary') {

      await db.query(`
        UPDATE Secretary SET
          phoneNbr = ?,
          password = COALESCE(NULLIF(?, ''), password)
        WHERE id_secretary = ?
      `, [phoneNbr, password || '', id]);

    } else if (role === 'admin') {

      await db.query(`
        UPDATE Admin SET
          phoneNbr = ?,
          password = COALESCE(NULLIF(?, ''), password)
        WHERE id_admin = ?
      `, [phoneNbr, password || '', id]);

    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid role.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Staff account updated successfully.'
    });

  } catch (error) {
    console.error('Edit staff error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating staff account.'
    });
  }
});


// ============================================
// 5. DELETE STAFF ACCOUNT
// DELETE /api/staff/:role/:id
// ============================================
// Admin permanently deletes a staff account.
// Used by: Admin (delete account)
// ============================================
router.delete('/:role/:id', async function(req, res) {
  try {

    const role = req.params.role;
    const id   = req.params.id;

    // ── Delete from the correct table ──
    if (role === 'doctor') {

      await db.query(
        'DELETE FROM Doctor WHERE id_doctor = ?',
        [id]
      );

    } else if (role === 'nurse') {

      await db.query(
        'DELETE FROM Nurse WHERE id_nurse = ?',
        [id]
      );

    } else if (role === 'secretary') {

      await db.query(
        'DELETE FROM Secretary WHERE id_secretary = ?',
        [id]
      );

    } else if (role === 'admin') {

      await db.query(
        'DELETE FROM Admin WHERE id_admin = ?',
        [id]
      );

    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid role.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Staff account deleted successfully.'
    });

  } catch (error) {
    console.error('Delete staff error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting staff account.'
    });
  }
});


// Export the router
module.exports = router;