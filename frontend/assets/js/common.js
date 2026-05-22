// ══════════════════════════════════════
// SHARED DATA & UTILITIES
// ══════════════════════════════════════

// Departments: key -> { name, dept, beds }
const DEPTS = {
  A: { name:'Dept A', dept:'General Medicine',  specialty:'General Practitioner', beds:10 },
  B: { name:'Dept B', dept:'Cardiology',         specialty:'Cardiologist',          beds:8  },
  C: { name:'Dept C', dept:'Pediatrics',         specialty:'Pediatrician',          beds:6  },
  D: { name:'Dept D', dept:'Orthopedics',        specialty:'Orthopedics',            beds:6  },
  E: { name:'Dept E', dept:'Neurology',          specialty:'Neurologist',            beds:6  },
  F: { name:'Dept F', dept:'Maternity',          specialty:'Gynecologist',           beds:6  }
};

// Staff list (doctors, nurses, secretary)
let staff = [
  {id:'STF-001',name:'Dr. Mehdi Khelil',  user:'khelil',   role:'doctor',    dept:'General Medicine', specialty:'General Practitioner', wing:'A', pass:'doc123',   phone:'0551 100 001'},
  {id:'STF-002',name:'Dr. Amine Benali',  user:'benali',   role:'doctor',    dept:'Cardiology',        specialty:'Cardiologist',          wing:'B', pass:'doc123',   phone:'0551 100 002'},
  {id:'STF-003',name:'Dr. Sara Rahmani',  user:'rahmani',  role:'doctor',    dept:'Pediatrics',        specialty:'Pediatrician',          wing:'C', pass:'doc123',   phone:'0551 100 003'},
  {id:'STF-004',name:'Dr. Leila Amara',   user:'amara',    role:'doctor',    dept:'Orthopedics',       specialty:'Orthopedics',           wing:'D', pass:'doc123',   phone:'0551 100 004'},
  {id:'STF-005',name:'Dr. Yacine Boukli', user:'boukli',   role:'doctor',    dept:'Cardiology',        specialty:'Cardiologist',          wing:'B', pass:'doc123',   phone:'0551 100 005'},
  {id:'STF-006',name:'Dr. Karim Said',    user:'ksaid',    role:'doctor',    dept:'Neurology',         specialty:'Neurologist',           wing:'E', pass:'doc123',   phone:'0551 100 006'},
  {id:'STF-007',name:'Dr. Sara Laila',    user:'slaila',   role:'doctor',    dept:'Maternity',         specialty:'Gynecologist',          wing:'F', pass:'doc123',   phone:'0551 100 007'},
  {id:'STF-008',name:'Nurse Fatima Ould', user:'nurse1',   role:'nurse',     dept:'General Medicine',  wing:'A', pass:'nurse123', phone:'0561 200 001'},
  {id:'STF-009',name:'Nurse Karim Bey',   user:'nurse2',   role:'nurse',     dept:'Cardiology',        wing:'B', pass:'nurse123', phone:'0561 200 002'},
  {id:'STF-010',name:'Nurse Amina Dali',  user:'nurse3',   role:'nurse',     dept:'Pediatrics',        wing:'C', pass:'nurse123', phone:'0561 200 003'},
  {id:'STF-011',name:'Nurse Riad Ferhi',  user:'nurse4',   role:'nurse',     dept:'Orthopedics',       wing:'D', pass:'nurse123', phone:'0561 200 004'},
  {id:'STF-012',name:'Nurse Nadia Ferhi', user:'nurse5',   role:'nurse',     dept:'Neurology',         wing:'E', pass:'nurse123', phone:'0561 200 005'},
  {id:'STF-013',name:'Nurse Rima Dali',   user:'nurse6',   role:'nurse',     dept:'Maternity',         wing:'F', pass:'nurse123', phone:'0561 200 006'},
  {id:'STF-014',name:'Medical Secretary', user:'secretary',role:'secretary', dept:'Reception',         wing:'-', pass:'sec123',   phone:'0550 300 001'}
];

let patients     = [];  // all patients
let appointments = [];  // all appointments
let beds         = [];  // all beds from backend
let ptCtr        = 1;   // patient ID counter
let apptCtr      = 1;   // appointment ID counter
let stfCtr       = 15;  // staff ID counter
let curUser      = null; // logged-in user

// ══════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════

// Convert DD/MM/YYYY to YYYY-MM-DD
function dateToISO(raw) {
  const pts = raw.split('/');
  return pts[2] + '-' + pts[1] + '-' + pts[0];
}

// Format date input as user types (auto-inserts slashes)
function fmtDate(el) {
  let v = el.value.replace(/\D/g, '');
  if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
  if (v.length > 5) v = v.slice(0, 5) + '/' + v.slice(5);
  el.value = v.slice(0, 10);
}

// Current timestamp as human-readable string
function now() {
  return new Date().toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

// Modal open/close
function openMo(id)   { document.getElementById(id)?.classList.add('open'); }
function closeMo(id)  { document.getElementById(id)?.classList.remove('open'); }
function closeMoBg(e) { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); }

// Toast notification
function showToast(msg, type = 'ok', duration = 3000) {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className   = 'toast t-' + type;
  t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { t.classList.add('show'); });
  });
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => { t.remove(); }, 300);
  }, duration);
}

function normalizeCounters() {
  if (patients.length) {
    const maxId = patients.reduce((max, patient) => {
      const num = parseInt(String(patient.id || '').replace(/^PT-/, ''), 10);
      return Number.isFinite(num) ? Math.max(max, num) : max;
    }, 0);
    ptCtr = maxId + 1;
  }

  if (appointments.length) {
    const maxId = appointments.reduce((max, appt) => {
      const num = parseInt(String(appt.id || '').replace(/^APPT-/, ''), 10);
      return Number.isFinite(num) ? Math.max(max, num) : max;
    }, 0);
    apptCtr = maxId + 1;
  }

  if (staff.length) {
    const maxId = staff.reduce((max, member) => {
      const num = parseInt(String(member.id || '').replace(/^STF-/, ''), 10);
      return Number.isFinite(num) ? Math.max(max, num) : max;
    }, 0);
    stfCtr = maxId + 1;
  }
}

function fixDuplicatePatientIds() {
  const seen = new Set();
  const remap = {};

  patients.forEach(function(patient) {
    const originalId = String(patient.id || '').trim();
    const invalid = !/^PT-\d+$/i.test(originalId);
    if (invalid || seen.has(originalId)) {
      const newId = 'PT-' + String(ptCtr++).padStart(3, '0');
      if (originalId) remap[originalId] = newId;
      patient.id = newId;
      seen.add(newId);
    } else {
      seen.add(originalId);
    }
  });

  if (Object.keys(remap).length) {
    appointments.forEach(function(appt) {
      if (appt.patId && remap[appt.patId]) {
        appt.patId = remap[appt.patId];
      }
    });
  }
}

function deptIdToWing(id) {
  return {
    1: 'A',
    2: 'B',
    3: 'C',
    4: 'D',
    5: 'E',
    6: 'F'
  }[Number(id)] || '-';
}

function deptNameToWing(name) {
  const map = {
    'General Medicine': 'A',
    'Cardiology': 'B',
    'Pediatrics': 'C',
    'Orthopedics': 'D',
    'Neurology': 'E',
    'Maternity': 'F'
  };
  return map[name] || '-';
}

function wingToDeptId(wing) {
  return {
    A: 1,
    B: 2,
    C: 3,
    D: 4,
    E: 5,
    F: 6
  }[String(wing).toUpperCase()] || null;
}

function formatDateFromISO(value) {
  if (!value) return '';
  const datePart = String(value).split('T')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return value;
}

function capitalizeWord(value) {
  if (!value) return '';
  return String(value).trim().charAt(0).toUpperCase() + String(value).trim().slice(1).toLowerCase();
}

function normalizeBackendPatient(raw) {
  const id = raw.id_patient ? 'PT-' + String(raw.id_patient).padStart(3, '0') : raw.id || '';
  const dept = raw.id_department ? deptIdToWing(raw.id_department) : deptNameToWing(raw.dept_name);
  const name = [raw.first_name, raw.last_name].filter(Boolean).join(' ').trim();

  return {
    id,
    name: name || 'Unknown Patient',
    dob: formatDateFromISO(raw.date_of_birth),
    gender: raw.gender || 'Unknown',
    blood: raw.blood_type || 'Unknown',
    phone: raw.phone || raw.phoneNbr || '',
    address: raw.address || '',
    allergies: raw.allergies || 'None',
    conditions: raw.conditions || 'None',
    status: capitalizeWord(raw.status || 'Admitted'),
    admitted: formatDateFromISO(raw.admitted_at),
    dischargedOn: formatDateFromISO(raw.discharged_at),
    dept: dept,
    bedNum: raw.roomNUM || raw.bedNum || '—',
    backendId: raw.id_patient,
    admissions: [{
      admDate: formatDateFromISO(raw.admitted_at),
      dischargedOn: formatDateFromISO(raw.discharged_at) || '',
      dept: dept,
      bedNum: raw.roomNUM || raw.bedNum || '—',
      evals: [],
      tx: [],
      vitals: []
    }]
  };
}

function normalizeBackendStaff(raw) {
  const id = 'STF-' + String(raw.id).padStart(3, '0');
  const role = raw.role || '';
  const wing = raw.id_department ? deptIdToWing(raw.id_department) : (role === 'secretary' ? '-' : '-');
  const dept = raw.id_department ? deptIdToWing(raw.id_department) : (role === 'secretary' ? 'Reception' : '-');

  return {
    id,
    backendId: raw.id,
    name: raw.name || 'Unknown',
    user: raw.username || raw.user || '',
    role,
    wing,
    dept,
    phone: raw.phone || raw.phoneNbr || '',
    specialty: raw.specialization || ''
  };
}

function normalizeBackendAppointment(raw) {
  const id = raw.id_appointment ? 'APPT-' + String(raw.id_appointment).padStart(3, '0') : raw.id || '';
  const patId = raw.id_patient ? 'PT-' + String(raw.id_patient).padStart(3, '0') : raw.patId || '';
  const docId = raw.id_doctor || raw.docId || null;
  const docUser = raw.doctor_user || raw.docUser || '';
  const docName = raw.doctor_name || raw.docName || '';
  const patName = (raw.patient_first || raw.patient_last)
    ? `${raw.patient_first || ''} ${raw.patient_last || ''}`.trim()
    : raw.patName || 'Unknown';
  const dept = raw.dept_name ? deptNameToWing(raw.dept_name) : (raw.dept || '-');
  const date = raw.appt_date || raw.date || '';
  const time = raw.appt_time || raw.from || '';

  return {
    id,
    date,
    from: time,
    to: raw.to || time,
    type: raw.type || 'Consultation',
    patId,
    patName: patName || 'Unknown Patient',
    docId,
    docUser,
    docName: docName || docUser || 'Unknown Doctor',
    dept: dept || '-'
  };
}

function normalizeBackendEvaluation(raw) {
  const dt = raw.timestamp ? new Date(raw.timestamp) : null;
  const date = dt ? dt.toISOString().slice(0, 10) : '';
  const time = dt ? dt.toTimeString().slice(0, 5) : '';

  return {
    id: raw.id_evaluation,
    date,
    time,
    datetime: raw.timestamp || '',
    by: raw.doctor_name || 'Unknown',
    state: raw.patient_state || 'Stable',
    notes: raw.observations || '',
    type: raw.eval_type || 'General'
  };
}

function normalizeBackendDose(raw) {
  return {
    id_treatment: raw.id_treatment,
    label: raw.label || '',
    datetime: raw.scheduled_at || '',
    done: Boolean(raw.is_done),
    doneBy: raw.nurse_name || '',
    scheduledAt: raw.scheduled_at || ''
  };
}

function normalizeBackendPrescription(raw) {
  const freqLabels = {
    once_daily: 'Once daily',
    twice_daily: 'Twice daily',
    three_daily: 'Three times daily',
    four_daily: 'Four times daily',
    every_8h: 'Every 8 hours',
    every_6h: 'Every 6 hours',
    every_4h: 'Every 4 hours',
    once_only: 'Once only'
  };

  return {
    id: raw.id_prescription,
    med: raw.medication || '',
    dose: raw.dosage || '',
    freq: raw.frequency || '',
    freqLabel: freqLabels[raw.frequency] || raw.frequency || 'Consultation',
    durDays: raw.duration_days || 1,
    prescribedAt: raw.first_dose_time || '',
    by: raw.doctor_name || 'Unknown',
    doses: Array.isArray(raw.doses) ? raw.doses.map(normalizeBackendDose) : []
  };
}

function normalizeBackendVital(raw) {
  const dt = raw.recorded_at ? new Date(raw.recorded_at) : null;
  const date = dt ? dt.toISOString().slice(0, 10) : '';
  const time = dt ? dt.toTimeString().slice(0, 5) : '';

  return {
    id: raw.id_vitals,
    datetime: raw.recorded_at || '',
    date,
    time,
    nurse: raw.nurse_name || 'Unknown',
    hr: raw.heart_rate || '',
    bp: raw.blood_pressure || '',
    temp: raw.temperature || '',
    spo2: raw.spo2 || ''
  };
}

function findDoseByTreatmentId(patient, treatmentId) {
  if (!patient || !patient.admissions) return null;
  for (let adm of patient.admissions) {
    if (!adm.tx) continue;
    for (let tx of adm.tx) {
      if (!tx.doses) continue;
      const dose = tx.doses.find(d => String(d.id_treatment) === String(treatmentId));
      if (dose) {
        return { dose, tx, adm };
      }
    }
  }
  return null;
}

async function loadPatientHistory(id) {
  const p = patients.find(function(x) { return x.id === id; });
  if (!p || !p.backendId) return;

  const [evalResp, presResp, vitResp] = await Promise.all([
    getPatientEvaluations(p.backendId),
    getPatientPrescriptions(p.backendId),
    getPatientVitals(p.backendId)
  ]);

  const admission = p.admissions && p.admissions.length ? p.admissions[p.admissions.length - 1] : null;
  if (!admission) return;

  admission.evals = Array.isArray(evalResp.evaluations)
    ? evalResp.evaluations.map(normalizeBackendEvaluation)
    : [];

  admission.tx = Array.isArray(presResp.prescriptions)
    ? presResp.prescriptions.map(normalizeBackendPrescription)
    : [];

  admission.vitals = Array.isArray(vitResp.vitals)
    ? vitResp.vitals.map(normalizeBackendVital)
    : [];
}

async function loadBackendData() {
  try {
    const [patientsResp, appointmentsResp, staffResp, bedsResp] = await Promise.all([
      getPatients(),
      getAppointments(),
      getStaff(),
      getBeds()
    ]);

    patients = Array.isArray(patientsResp.patients)
      ? patientsResp.patients.map(normalizeBackendPatient)
      : [];

    appointments = Array.isArray(appointmentsResp.appointments)
      ? appointmentsResp.appointments.map(normalizeBackendAppointment)
      : [];

    staff = Array.isArray(staffResp.staff)
      ? staffResp.staff.map(normalizeBackendStaff)
      : [];

    beds = Array.isArray(bedsResp && bedsResp.beds) ? bedsResp.beds : [];

    normalizeCounters();
    fixDuplicatePatientIds();
  } catch (error) {
    console.error('Backend load failed:', error);
    throw error;
  }
}

// Initialize data from backend on first page load.
// Pages should call loadBackendData() before rendering.
