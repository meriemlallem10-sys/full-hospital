// ============================================
// routes/patients.js — PATIENT ROUTES
// ============================================
// Handles everything related to patients:
// - Register new patient
// - Get all patients
// - Get one patient file
// - Edit patient info
// - Discharge patient
// - Readmit patient
// ============================================

const router = require('express').Router();
const db     = require('../db');


// ============================================
// 1. GET ALL PATIENTS
// GET /api/patients
// ============================================
// Returns a list of ALL patients with their
// bed and department information.
// Used by: Secretary (patient list page)
//          Doctor (their department patients)
//          Nurse (their department patients)
// ============================================
router.get('/', async function(req, res) {
  try {

    // This query gets every patient
    // and also brings in bed + department info using JOIN
    const [rows] = await db.query(`
      SELECT
        p.id_patient,
        p.first_name,
        p.last_name,
        p.date_of_birth,
        p.gender,
        p.blood_type,
        p.phone,
        p.address,
        p.allergies,
        p.conditions,
        p.status,
        p.admitted_at,
        p.discharged_at,
        b.id_bed,
        b.roomNUM,
        d.id_department,
        d.name  AS dept_name
      FROM Patient p
      LEFT JOIN Bed        b ON p.id_bed          = b.id_bed
      LEFT JOIN Department d ON b.id_department   = d.id_department
      ORDER BY p.admitted_at DESC
    `);
    // ORDER BY admitted_at DESC = most recently admitted first

    // Send all patients back to frontend
    return res.status(200).json({
      success:  true,
      patients: rows
    });

  } catch (error) {
    console.error('Get patients error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching patients.'
    });
  }
});


// ============================================
// 2. GET ONE PATIENT (Full File)
// GET /api/patients/:id
// ============================================
// Returns ONE patient's complete medical file
// including evaluations, prescriptions,
// treatment check-ins, and vitals.
// Used by: Doctor, Nurse, Secretary
// ============================================
router.get('/:id', async function(req, res) {
  try {

    // req.params.id = the number in the URL
    // Example: GET /api/patients/3 → req.params.id = "3"
    const patientId = req.params.id;

    // ── Get patient basic info ──
    const [patRows] = await db.query(`
      SELECT
        p.*,
        b.roomNUM,
        d.id_department,
        d.name AS dept_name
      FROM Patient p
      LEFT JOIN Bed        b ON p.id_bed        = b.id_bed
      LEFT JOIN Department d ON b.id_department = d.id_department
      WHERE p.id_patient = ?
    `, [patientId]);

    // If no patient found with this ID
    if (!patRows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.'
      });
    }

    const patient = patRows[0];

    // ── Get this patient's evaluations ──
    const [evals] = await db.query(`
      SELECT
        e.*,
        doc.name AS doctor_name
      FROM Evaluation e
      LEFT JOIN Doctor doc ON e.id_doctor = doc.id_doctor
      WHERE e.id_patient = ?
      ORDER BY e.timestamp DESC
    `, [patientId]);

    // ── Get this patient's prescriptions ──
    const [prescriptions] = await db.query(`
      SELECT
        pr.*,
        doc.name AS doctor_name
      FROM Prescription pr
      LEFT JOIN Doctor doc ON pr.id_doctor = doc.id_doctor
      WHERE pr.id_patient = ?
      ORDER BY pr.id_prescription DESC
    `, [patientId]);

    // ── Get treatment check-ins for each prescription ──
    // We loop through each prescription and get its doses
    for (let i = 0; i < prescriptions.length; i++) {
      const [doses] = await db.query(`
        SELECT
          t.*,
          n.name AS nurse_name
        FROM Treatment_CheckIn t
        LEFT JOIN Nurse n ON t.id_nurse = n.id_nurse
        WHERE t.id_prescription = ?
        ORDER BY t.scheduled_at ASC
      `, [prescriptions[i].id_prescription]);

      // Attach the doses to their prescription
      prescriptions[i].doses = doses;
    }

    // ── Get this patient's vitals ──
    const [vitals] = await db.query(`
      SELECT
        v.*,
        n.name AS nurse_name
      FROM Vitals v
      LEFT JOIN Nurse n ON v.id_nurse = n.id_nurse
      WHERE v.id_patient = ?
      ORDER BY v.recorded_at DESC
    `, [patientId]);

    // ── Send everything back ──
    return res.status(200).json({
      success:       true,
      patient:       patient,
      evaluations:   evals,
      prescriptions: prescriptions,
      vitals:        vitals
    });

  } catch (error) {
    console.error('Get patient file error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching patient file.'
    });
  }
});


// ============================================
// 3. REGISTER NEW PATIENT
// POST /api/patients
// ============================================
// Creates a new patient row in the database
// and marks the assigned bed as occupied.
// Used by: Secretary
// ============================================
router.post('/', async function(req, res) {
  try {

    // Read all the fields sent by the frontend
    const {
      first_name,
      last_name,
      date_of_birth,
      gender,
      blood_type,
      phone,
      address,
      allergies,
      conditions,
      id_bed,
      id_secretary
    } = req.body;
    // This is called "destructuring" — a short way to
    // extract multiple values from req.body at once

    // ── Validate required fields ──
    if (!first_name || !last_name || !gender || !id_bed) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, gender and bed are required.'
      });
    }

    // ── Check that the bed exists and is NOT already occupied ──
    const [bedRows] = await db.query(
      'SELECT * FROM Bed WHERE id_bed = ?',
      [id_bed]
    );

    if (!bedRows[0]) {
      return res.status(400).json({
        success: false,
        message: 'Bed not found.'
      });
    }

    if (bedRows[0].is_occupied) {
      return res.status(400).json({
        success: false,
        message: 'This bed is already occupied.'
      });
    }

    // ── Insert the new patient into the database ──
    const [result] = await db.query(`
      INSERT INTO Patient (
        first_name, last_name, date_of_birth, gender,
        blood_type, phone, address, allergies, conditions,
        status, admitted_at, id_bed, id_secretary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'admitted', NOW(), ?, ?)
    `, [
      first_name,
      last_name,
      date_of_birth || null,
      gender,
      blood_type    || null,
      phone         || null,
      address       || null,
      allergies     || 'None',
      conditions    || 'None',
      id_bed,
      id_secretary  || null
    ]);
    // NOW() = MySQL function that inserts the current date and time
    // result.insertId = the auto-generated ID of the new patient

    // ── Mark the bed as occupied ──
    await db.query(
      'UPDATE Bed SET is_occupied = TRUE WHERE id_bed = ?',
      [id_bed]
    );

    // ── Send back success with the new patient's ID ──
    return res.status(201).json({
      success:    true,
      message:    `Patient ${first_name} ${last_name} registered successfully.`,
      id_patient: result.insertId
    });
    // 201 = "Created" — something new was created successfully

  } catch (error) {
    console.error('Register patient error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while registering patient.'
    });
  }
});


// ============================================
// 4. EDIT PATIENT INFO
// PUT /api/patients/:id
// ============================================
// Updates patient personal information.
// Used by: Secretary
// ============================================
router.put('/:id', async function(req, res) {
  try {

    const patientId = req.params.id;

    const {
      first_name,
      last_name,
      phone,
      blood_type,
      address,
      allergies,
      conditions
    } = req.body;

    // ── Check patient exists ──
    const [check] = await db.query(
      'SELECT id_patient FROM Patient WHERE id_patient = ?',
      [patientId]
    );

    if (!check[0]) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.'
      });
    }

    // ── Update the patient row ──
    await db.query(`
      UPDATE Patient SET
        first_name  = ?,
        last_name   = ?,
        phone       = ?,
        blood_type  = ?,
        address     = ?,
        allergies   = ?,
        conditions  = ?
      WHERE id_patient = ?
    `, [
      first_name,
      last_name,
      phone,
      blood_type,
      address,
      allergies,
      conditions,
      patientId
    ]);

    return res.status(200).json({
      success: true,
      message: 'Patient information updated successfully.'
    });

  } catch (error) {
    console.error('Edit patient error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating patient.'
    });
  }
});


// ============================================
// 5. DISCHARGE PATIENT
// PUT /api/patients/:id/discharge
// ============================================
// Marks the patient as discharged,
// records the discharge date,
// and frees up their bed.
// Used by: Secretary
// ============================================
router.put('/:id/discharge', async function(req, res) {
  try {

    const patientId = req.params.id;

    // ── Get the patient to find their bed ──
    const [rows] = await db.query(
      'SELECT * FROM Patient WHERE id_patient = ?',
      [patientId]
    );

    if (!rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.'
      });
    }

    const patient = rows[0];

    // ── Check they are not already discharged ──
    if (patient.status === 'discharged') {
      return res.status(400).json({
        success: false,
        message: 'Patient is already discharged.'
      });
    }

    // ── Update patient: set discharged status ──
    await db.query(`
      UPDATE Patient SET
        status        = 'discharged',
        discharged_at = NOW(),
        id_bed        = NULL
      WHERE id_patient = ?
    `, [patientId]);
    // id_bed = NULL means they no longer occupy a bed

    // ── Free the bed ──
    if (patient.id_bed) {
      await db.query(
        'UPDATE Bed SET is_occupied = FALSE WHERE id_bed = ?',
        [patient.id_bed]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Patient discharged successfully.'
    });

  } catch (error) {
    console.error('Discharge error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while discharging patient.'
    });
  }
});


// ============================================
// 6. READMIT PATIENT
// PUT /api/patients/:id/readmit
// ============================================
// Re-admits a previously discharged patient,
// assigns them a new bed.
// Used by: Secretary
// ============================================
router.put('/:id/readmit', async function(req, res) {
  try {

    const patientId  = req.params.id;
    const { id_bed } = req.body;

    if (!id_bed) {
      return res.status(400).json({
        success: false,
        message: 'A bed must be selected for readmission.'
      });
    }

    // ── Check patient exists ──
    const [rows] = await db.query(
      'SELECT * FROM Patient WHERE id_patient = ?',
      [patientId]
    );

    if (!rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.'
      });
    }

    // ── Check the new bed is free ──
    const [bedRows] = await db.query(
      'SELECT * FROM Bed WHERE id_bed = ?',
      [id_bed]
    );

    if (!bedRows[0]) {
      return res.status(400).json({
        success: false,
        message: 'Bed not found.'
      });
    }

    if (bedRows[0].is_occupied) {
      return res.status(400).json({
        success: false,
        message: 'This bed is already occupied.'
      });
    }

    // ── Readmit: update patient row ──
    await db.query(`
      UPDATE Patient SET
        status        = 'admitted',
        admitted_at   = NOW(),
        discharged_at = NULL,
        id_bed        = ?
      WHERE id_patient = ?
    `, [id_bed, patientId]);

    // ── Mark new bed as occupied ──
    await db.query(
      'UPDATE Bed SET is_occupied = TRUE WHERE id_bed = ?',
      [id_bed]
    );

    return res.status(200).json({
      success: true,
      message: 'Patient readmitted successfully.'
    });

  } catch (error) {
    console.error('Readmit error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while readmitting patient.'
    });
  }
});


// Export the router
module.exports = router;