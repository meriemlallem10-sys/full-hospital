// ============================================
// routes/evaluations.js — EVALUATION ROUTES
// ============================================
// Handles clinical evaluations written by doctors.
// - Get all evaluations for a patient
// - Write a new evaluation
// ============================================

const router = require('express').Router();
const db     = require('../db');


// ============================================
// 1. GET EVALUATIONS FOR A PATIENT
// GET /api/evaluations/patient/:id_patient
// ============================================
// Returns all evaluations written for
// a specific patient, newest first.
// Used by: Doctor, Nurse (patient file)
// ============================================
router.get('/patient/:id_patient', async function(req, res) {
  try {

    const patientId = req.params.id_patient;

    const [rows] = await db.query(`
      SELECT
        e.id_evaluation,
        e.eval_type,
        e.patient_state,
        e.observations,
        e.timestamp,
        d.id_doctor,
        d.name      AS doctor_name,
        d.specialization
      FROM Evaluation e
      LEFT JOIN Doctor d ON e.id_doctor = d.id_doctor
      WHERE e.id_patient = ?
      ORDER BY e.timestamp DESC
    `, [patientId]);
    // ORDER BY timestamp DESC = newest evaluation shown first

    return res.status(200).json({
      success:     true,
      evaluations: rows
    });

  } catch (error) {
    console.error('Get evaluations error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching evaluations.'
    });
  }
});


// ============================================
// 2. WRITE A NEW EVALUATION
// POST /api/evaluations
// ============================================
// Doctor writes a clinical evaluation
// for a patient.
// Used by: Doctor (write evaluation tab)
// ============================================
router.post('/', async function(req, res) {
  try {

    const {
      eval_type,
      patient_state,
      observations,
      id_patient,
      id_doctor
    } = req.body;

    // ── Validate required fields ──
    if (!observations || !id_patient || !id_doctor) {
      return res.status(400).json({
        success: false,
        message: 'Observations, patient and doctor are required.'
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

    // ── Check doctor exists ──
    const [docRows] = await db.query(
      'SELECT id_doctor FROM Doctor WHERE id_doctor = ?',
      [id_doctor]
    );

    if (!docRows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.'
      });
    }

    // ── Insert the evaluation ──
    // timestamp is automatically set by MySQL (DEFAULT CURRENT_TIMESTAMP)
    // so we do not need to send it from the frontend
    const [result] = await db.query(`
      INSERT INTO Evaluation (
        eval_type,
        patient_state,
        observations,
        id_patient,
        id_doctor
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      eval_type     || 'General',
      patient_state || 'Stable',
      observations,
      id_patient,
      id_doctor
    ]);

    return res.status(201).json({
      success:       true,
      message:       'Evaluation saved successfully.',
      id_evaluation: result.insertId
    });

  } catch (error) {
    console.error('Save evaluation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while saving evaluation.'
    });
  }
});


// Export the router
module.exports = router;