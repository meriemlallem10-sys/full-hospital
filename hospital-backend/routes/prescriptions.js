// ============================================
// routes/prescriptions.js — PRESCRIPTION ROUTES
// ============================================
// Handles prescriptions written by doctors
// AND the treatment check-ins (doses) for nurses.
//
// When a doctor prescribes medication, we
// automatically generate all the dose rows
// in Treatment_CheckIn table.
//
// Example: "Amoxicillin 3 times a day for 2 days"
// → generates 6 Treatment_CheckIn rows automatically
// ============================================

const router = require('express').Router();
const db     = require('../db');


// ============================================
// 1. GET PRESCRIPTIONS FOR A PATIENT
// GET /api/prescriptions/patient/:id_patient
// ============================================
// Returns all prescriptions for a patient
// including all their doses (treatment check-ins)
// Used by: Doctor, Nurse (patient file)
// ============================================
router.get('/patient/:id_patient', async function(req, res) {
  try {

    const patientId = req.params.id_patient;

    // ── Get all prescriptions for this patient ──
    const [prescriptions] = await db.query(`
      SELECT
        pr.id_prescription,
        pr.medication,
        pr.dosage,
        pr.frequency,
        pr.duration_days,
        pr.first_dose_time,
        pr.id_patient,
        pr.id_doctor,
        d.name AS doctor_name,
        d.specialization
      FROM Prescription pr
      LEFT JOIN Doctor d ON pr.id_doctor = d.id_doctor
      WHERE pr.id_patient = ?
      ORDER BY pr.id_prescription DESC
    `, [patientId]);

    // ── For each prescription, get its doses ──
    // We loop through each prescription and fetch
    // its Treatment_CheckIn rows from the database
    for (let i = 0; i < prescriptions.length; i++) {

      const [doses] = await db.query(`
        SELECT
          t.id_treatment,
          t.label,
          t.scheduled_at,
          t.is_done,
          t.administered_at,
          n.name AS nurse_name
        FROM Treatment_CheckIn t
        LEFT JOIN Nurse n ON t.id_nurse = n.id_nurse
        WHERE t.id_prescription = ?
        ORDER BY t.scheduled_at ASC
      `, [prescriptions[i].id_prescription]);

      // Attach doses array to this prescription object
      // So the frontend gets everything in one response
      prescriptions[i].doses = doses;
    }

    return res.status(200).json({
      success:       true,
      prescriptions: prescriptions
    });

  } catch (error) {
    console.error('Get prescriptions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching prescriptions.'
    });
  }
});


// ============================================
// 2. CREATE NEW PRESCRIPTION
// POST /api/prescriptions
// ============================================
// Doctor prescribes medication.
// We save the prescription AND automatically
// generate all the dose rows in Treatment_CheckIn.
// Used by: Doctor (prescribe treatment tab)
// ============================================
router.post('/', async function(req, res) {
  try {

    const {
      medication,
      dosage,
      frequency,
      duration_days,
      first_dose_time,
      id_patient,
      id_doctor
    } = req.body;

    // ── Validate required fields ──
    if (!medication || !id_patient || !id_doctor || !duration_days || !frequency) {
      return res.status(400).json({
        success: false,
        message: 'Medication, frequency, duration, patient and doctor are required.'
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

    // ── Insert the prescription ──
    const [result] = await db.query(`
      INSERT INTO Prescription (
        medication,
        dosage,
        frequency,
        duration_days,
        first_dose_time,
        id_patient,
        id_doctor
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      medication,
      dosage          || null,
      frequency,
      duration_days,
      first_dose_time || '08:00:00',
      id_patient,
      id_doctor
    ]);

    const prescriptionId = result.insertId;
    // This is the auto-generated ID of the new prescription
    // We need it to link the doses to this prescription

    // ── Auto-generate Treatment_CheckIn rows ──
    // This is the important part!
    // Based on frequency and duration, we calculate
    // exactly when each dose should be given
    // and create a row for each one.

    // How many doses per day based on frequency?
    // This matches exactly what the frontend uses
    const dosesPerDay = {
      'once_daily':   1,
      'twice_daily':  2,
      'three_daily':  3,
      'four_daily':   4,
      'every_8h':     3,
      'every_6h':     4,
      'every_4h':     6,
      'once_only':    1
    };

    // How many hours between each dose?
    const intervalHours = {
      'once_daily':  24,
      'twice_daily': 12,
      'three_daily':  8,
      'four_daily':   6,
      'every_8h':     8,
      'every_6h':     6,
      'every_4h':     4,
      'once_only':   24
    };

    const perDay  = dosesPerDay[frequency]  || 1;
    const interval = intervalHours[frequency] || 24;

    // Parse the first dose time (e.g. "08:00")
    const timeParts = (first_dose_time || '08:00').split(':');
    const startHour = parseInt(timeParts[0]) || 8;
    const startMin  = parseInt(timeParts[1]) || 0;

    // We will collect all dose INSERT values here
    // then insert them all at once (more efficient)
    const doseValues = [];

    // Loop through each day of the treatment
    for (let day = 0; day < duration_days; day++) {

      // Loop through each dose within that day
      for (let doseIndex = 0; doseIndex < perDay; doseIndex++) {

        // Calculate what hour this dose should happen
        const totalHoursFromStart = (day * 24) + (doseIndex * interval);
        const doseHour = (startHour + (doseIndex * interval)) % 24;
        const doseMin  = startMin;

        // Format: "Day 1 • 08:00", "Day 1 • 16:00", "Day 2 • 08:00"
        const doseLabel = `Day ${day + 1} • ${
          String(doseHour).padStart(2, '0')}:${
          String(doseMin).padStart(2, '0')}`;

        // Build a scheduled datetime
        // We use today as the base date and add days
        const scheduleDate = new Date();
        scheduleDate.setDate(scheduleDate.getDate() + day);
        scheduleDate.setHours(doseHour, doseMin, 0, 0);

        // Format datetime for MySQL: "YYYY-MM-DD HH:MM:SS"
        const scheduledAt = scheduleDate.toISOString()
          .slice(0, 19)
          .replace('T', ' ');

        // Add this dose to our list
        // Format: [label, scheduled_at, is_done, id_prescription]
        doseValues.push([
          doseLabel,
          scheduledAt,
          false,         // is_done starts as false
          prescriptionId
        ]);
      }
    }

    // ── Insert all doses at once ──
    // This inserts ALL dose rows in a single SQL query
    // which is much faster than inserting one by one
    if (doseValues.length > 0) {
      await db.query(`
        INSERT INTO Treatment_CheckIn
          (label, scheduled_at, is_done, id_prescription)
        VALUES ?
      `, [doseValues]);
      // The ? here accepts an ARRAY of arrays
      // mysql2 handles this automatically
    }

    return res.status(201).json({
      success:         true,
      message:         `Prescription saved with ${doseValues.length} doses generated.`,
      id_prescription: prescriptionId,
      doses_generated: doseValues.length
    });

  } catch (error) {
    console.error('Save prescription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while saving prescription.'
    });
  }
});


// Export the router
module.exports = router;