// ============================================
// routes/appointments.js — APPOINTMENT ROUTES
// ============================================
// Handles everything related to appointments:
// - Get all appointments
// - Get appointments by doctor
// - Schedule new appointment
// ============================================

const router = require('express').Router();
const db     = require('../db');


// ============================================
// 1. GET ALL APPOINTMENTS
// GET /api/appointments
// ============================================
// Returns all appointments with patient
// and doctor information.
// Used by: Secretary (appointments page)
// ============================================
router.get('/', async function(req, res) {
  try {

    const [rows] = await db.query(`
      SELECT
        a.id_appointment,
        a.appt_date,
        a.appt_time,
        a.type,
        p.id_patient,
        p.first_name      AS patient_first,
        p.last_name       AS patient_last,
        d.id_doctor,
        d.username        AS doctor_user,
        d.name            AS doctor_name,
        d.specialization,
        dep.id_department,
        dep.name          AS dept_name,
        s.name            AS secretary_name
      FROM Appointment a
      LEFT JOIN Patient   p   ON a.id_patient   = p.id_patient
      LEFT JOIN Doctor    d   ON a.id_doctor    = d.id_doctor
      LEFT JOIN Department dep ON d.id_department = dep.id_department
      LEFT JOIN Secretary s   ON a.id_secretary = s.id_secretary
      ORDER BY a.appt_date DESC, a.appt_time DESC
    `);

    return res.status(200).json({
      success:      true,
      appointments: rows
    });

  } catch (error) {
    console.error('Get appointments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching appointments.'
    });
  }
});


// ============================================
// 2. GET APPOINTMENTS BY DOCTOR
// GET /api/appointments/doctor/:id_doctor
// ============================================
// Returns only the appointments for a
// specific doctor.
// Used by: Doctor (appointments page)
// ============================================
router.get('/doctor/:id_doctor', async function(req, res) {
  try {

    const doctorId = req.params.id_doctor;

    const [rows] = await db.query(`
      SELECT
        a.id_appointment,
        a.appt_date,
        a.appt_time,
        a.type,
        p.id_patient,
        p.first_name  AS patient_first,
        p.last_name   AS patient_last,
        p.status      AS patient_status,
        b.roomNUM,
        dep.name      AS dept_name
      FROM Appointment a
      LEFT JOIN Patient    p   ON a.id_patient     = p.id_patient
      LEFT JOIN Bed        b   ON p.id_bed          = b.id_bed
      LEFT JOIN Department dep ON b.id_department   = dep.id_department
      WHERE a.id_doctor = ?
      ORDER BY a.appt_date DESC, a.appt_time ASC
    `, [doctorId]);

    return res.status(200).json({
      success:      true,
      appointments: rows
    });

  } catch (error) {
    console.error('Get doctor appointments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching doctor appointments.'
    });
  }
});


// ============================================
// 3. SCHEDULE NEW APPOINTMENT
// POST /api/appointments
// ============================================
// Creates a new appointment.
// Checks for time conflicts before saving.
// Used by: Secretary (schedule appointment)
// ============================================
router.post('/', async function(req, res) {
  try {

    // Read data sent by the frontend
    const {
      appt_date,
      appt_time,
      type,
      id_patient,
      id_doctor,
      id_secretary
    } = req.body;

    // ── Validate required fields ──
    if (!appt_date || !appt_time || !id_patient || !id_doctor) {
      return res.status(400).json({
        success: false,
        message: 'Date, time, patient and doctor are required.'
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

    // ── Check for time conflict ──
    // A conflict means: same doctor, same date, same time
    // We do not want to double-book a doctor
    const [conflict] = await db.query(`
      SELECT id_appointment
      FROM Appointment
      WHERE id_doctor  = ?
        AND appt_date  = ?
        AND appt_time  = ?
    `, [id_doctor, appt_date, appt_time]);

    if (conflict[0]) {
      return res.status(400).json({
        success: false,
        message: 'This doctor already has an appointment at this time.'
      });
    }

    // ── Insert the new appointment ──
    const [result] = await db.query(`
      INSERT INTO Appointment (
        appt_date,
        appt_time,
        type,
        id_patient,
        id_doctor,
        id_secretary
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      appt_date,
      appt_time,
      type         || 'Consultation',
      id_patient,
      id_doctor,
      id_secretary || null
    ]);

    return res.status(201).json({
      success:        true,
      message:        'Appointment scheduled successfully.',
      id_appointment: result.insertId
    });

  } catch (error) {
    console.error('Schedule appointment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while scheduling appointment.'
    });
  }
});


// ============================================
// 4. DELETE APPOINTMENT
// DELETE /api/appointments/:id
// ============================================
// Removes an appointment from the database.
// Used by: Secretary
// ============================================
router.delete('/:id', async function(req, res) {
  try {

    const appointmentId = req.params.id;

    // ── Check it exists first ──
    const [rows] = await db.query(
      'SELECT id_appointment FROM Appointment WHERE id_appointment = ?',
      [appointmentId]
    );

    if (!rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.'
      });
    }

    // ── Delete it ──
    await db.query(
      'DELETE FROM Appointment WHERE id_appointment = ?',
      [appointmentId]
    );

    return res.status(200).json({
      success: true,
      message: 'Appointment deleted successfully.'
    });

  } catch (error) {
    console.error('Delete appointment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting appointment.'
    });
  }
});


// Export the router
module.exports = router;