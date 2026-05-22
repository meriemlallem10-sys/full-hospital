// ══════════════════════════════════════
// API HELPER — shared backend communication
// ══════════════════════════════════════

const API_BASE = 'http://localhost:3000/api';

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(API_BASE + endpoint, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || 'API request failed');
    error.response = response;
    error.data = data;
    throw error;
  }

  return data;
}

async function loginUser(username, password, role) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password, role })
  });
}

async function getPatients() {
  return apiRequest('/patients');
}

async function getAppointments() {
  return apiRequest('/appointments');
}

async function getStaff() {
  return apiRequest('/staff');
}

async function getBeds() {
  return apiRequest('/beds');
}

async function getAvailableBeds(id_department) {
  return apiRequest('/beds/available/' + id_department);
}

async function createPatient(payload) {
  return apiRequest('/patients', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function updatePatient(id, payload) {
  return apiRequest('/patients/' + id, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

async function createAppointment(payload) {
  return apiRequest('/appointments', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function readmitPatient(id, id_bed) {
  return apiRequest('/patients/' + id + '/readmit', {
    method: 'PUT',
    body: JSON.stringify({ id_bed })
  });
}

async function dischargePatient(id) {
  return apiRequest('/patients/' + id + '/discharge', {
    method: 'PUT'
  });
}

async function getPatientEvaluations(id_patient) {
  return apiRequest('/evaluations/patient/' + id_patient);
}

async function createEvaluation(payload) {
  return apiRequest('/evaluations', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function getPatientPrescriptions(id_patient) {
  return apiRequest('/prescriptions/patient/' + id_patient);
}

async function createPrescription(payload) {
  return apiRequest('/prescriptions', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function getPatientVitals(id_patient) {
  return apiRequest('/vitals/patient/' + id_patient);
}

async function createVitals(payload) {
  return apiRequest('/vitals', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function markDoseDone(id_treatment, id_nurse) {
  return apiRequest('/vitals/treatment/' + id_treatment + '/done', {
    method: 'PUT',
    body: JSON.stringify({ id_nurse })
  });
}

async function createStaffMember(payload) {
  return apiRequest('/staff', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function updateStaffMember(role, id, payload) {
  return apiRequest('/staff/' + role + '/' + id, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

async function deleteStaffMember(role, id) {
  return apiRequest('/staff/' + role + '/' + id, {
    method: 'DELETE'
  });
}
