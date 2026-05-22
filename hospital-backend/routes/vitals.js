// ============================================
// routes/vitals.js — VITAL SIGNS ROUTES
// ============================================
// Handles vital signs recorded by nurses.
// - Get all vitals for a patient
// - Record new vital signs
// ============================================

const router = require('express').Router();
const db     = require('../db');


// ============================================
// 1. GET VITALS FOR A PATIENT
// GET /api/vitals/patient/:id_patient
// ============================================
// Returns all vital sign records for a patient
// newest first.
// Used by: Doctor, Nurse (patient file)
// ============================================
router.get('/patient/:id_patient', async function(req, res) {
  try {

    const patientId = req.params.id_patient;

    const [rows] = await db.query(`
      SELECT
        v.id_vitals,
        v.heart_rate,
        v.blood_pressure,
        v.temperature,
        v.spo2,
        v.recorded_at,
        n.id_nurse,
        n.name    AS nurse_name
      FROM Vitals v
      LEFT JOIN Nurse n ON v.id_nurse = n.id_nurse
      WHERE v.id_patient = ?
      ORDER BY v.recorded_at DESC
    `, [patientId]);
    // ORDER BY recorded_at DESC = most recent vitals shown first

    return res.status(200).json({
      success: true,
      vitals:  rows
    });

  } catch (error) {
    console.error('Get vitals error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching vitals.'
    });
  }
});


// ============================================
// 2. RECORD NEW VITAL SIGNS
// POST /api/vitals
// ============================================
// Nurse records a patient's vital signs.
// Used by: Nurse (record vitals tab)
// ============================================
router.post('/', async function(req, res) {
  try {

    const {
      heart_rate,
      blood_pressure,
      temperature,
      spo2,
      id_patient,
      id_nurse
    } = req.body;

    // ── Validate required fields ──
    if (!heart_rate || !blood_pressure || !temperature || !spo2 || !id_patient || !id_nurse) {
      return res.status(400).json({
        success: false,
        message: 'All vital signs, patient and nurse are required.'
      });
    }

    // ── Check patient exists ──
    const [patRows] = await db.query(
      'SELECT id_patient FROM Patient WHERE id_patient = ?',
      [id_patient]
    );

    if (!patRows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.'
      });
    }

    // ── Check nurse exists ──
    const [nurseRows] = await db.query(
      'SELECT id_nurse FROM Nurse WHERE id_nurse = ?',
      [id_nurse]
    );

    if (!nurseRows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Nurse not found.'
      });
    }

    // ── Insert the vital signs record ──
    // recorded_at is set automatically by MySQL
    const [result] = await db.query(`
      INSERT INTO Vitals (
        heart_rate,
        blood_pressure,
        temperature,
        spo2,
        id_patient,
        id_nurse
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      heart_rate,
      blood_pressure,
      temperature,
      spo2,
      id_patient,
      id_nurse
    ]);

    return res.status(201).json({
      success:   true,
      message:   'Vital signs recorded successfully.',
      id_vitals: result.insertId
    });

  } catch (error) {
    console.error('Record vitals error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while recording vitals.'
    });
  }
});


// ============================================
// 3. MARK TREATMENT DOSE AS DONE
// PUT /api/vitals/treatment/:id_treatment/done
// ============================================
// Nurse marks a dose as administered.
// This is the checkbox the nurse clicks
// when they give a patient their medication.
// Used by: Nurse (treatment check-in)
// ============================================
router.put('/treatment/:id_treatment/done', async function(req, res) {
  try {

    const treatmentId = req.params.id_treatment;
    const { id_nurse } = req.body;

    // ── Check the treatment dose exists ──
    const [rows] = await db.query(
      'SELECT * FROM Treatment_CheckIn WHERE id_treatment = ?',
      [treatmentId]
    );

    if (!rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Treatment dose not found.'
      });
    }

    // ── Check it is not already marked as done ──
    if (rows[0].is_done) {
      return res.status(400).json({
        success: false,
        message: 'This dose is already marked as done.'
      });
    }

    // ── Mark the dose as done ──
    // administered_at = the exact moment the nurse gave the dose
    await db.query(`
      UPDATE Treatment_CheckIn SET
        is_done         = TRUE,
        administered_at = NOW(),
        id_nurse        = ?
      WHERE id_treatment = ?
    `, [id_nurse || null, treatmentId]);

    return res.status(200).json({
      success: true,
      message: 'Dose marked as done successfully.'
    });

  } catch (error) {
    console.error('Mark dose done error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while marking dose as done.'
    });
  }
});


// Export the router
module.exports = router;