// ══════════════════════════════════════
// PATIENT FILE (modal) FUNCTIONS
// ══════════════════════════════════════

function row(label, value) {
  return '<div class="prow"><div class="prl">' + label + '</div><div class="prv">' + value + '</div></div>';
}

function loadPatientFile() {
  const urlParams = new URLSearchParams(window.location.search);
  const patId = urlParams.get('id');
  const role = urlParams.get('role') || 'secretary';

  if (!patId) {
    showToast('No patient ID provided.', 'err');
    return;
  }

  const cleanId = patId ? patId.trim() : '';
  let patient = patients.find(p => String(p.id || '').trim().toLowerCase() === cleanId.toLowerCase());
  if (!patient && cleanId) {
    patient = patients.find(p => String(p.name || '').trim().toLowerCase() === cleanId.toLowerCase());
  }
  if (!patient && cleanId) {
    patient = patients.find(p => String(p.name || '').trim().toLowerCase().includes(cleanId.toLowerCase()));
  }
  if (!patient) {
    showToast('Patient not found.', 'err');
    return;
  }

  const roleNames = { secretary: 'Patient File', doctor: 'Medical File', nurse: 'Medical File', admin: 'Medical File' };
  document.getElementById('file-mo-title').textContent = roleNames[role] + ' — ' + patient.name;

  // Personal Information + Admission Status
  let html = '<div class="fs"><div class="fst">PERSONAL INFORMATION</div>'
    + row('Full Name', '<b>' + patient.name + '</b> <span style="font-size:11px;color:var(--text3);">' + patient.id + '</span>')
    + row('Date of Birth', patient.dob || '—')
    + row('Gender', patient.gender || '—')
    + row('Blood Type', patient.blood || '—')
    + row('Phone', patient.phone || '—')
    + row('Address', patient.address || '—')
    + row('Allergies', patient.allergies || 'None')
    + row('Conditions', patient.conditions || 'None')
    + '</div>';
  // compute latest admission/discharge
  const adms = patient.admissions || [];
  const latest = adms.length ? adms[adms.length - 1] : null;
  const latestAdmDate = latest ? (latest.admDate || '—') : (patient.admitted || '—');
  const latestDisDate = latest ? (latest.dischargedOn || 'Active') : (patient.dischargedOn || '—');

  html += '<div class="fs"><div class="fst">ADMISSION STATUS</div>'
    + row('Status', '<span class="badge ' + (patient.status === 'Admitted' ? 'b-g' : 'b-gr') + '">' + (patient.status || '—') + '</span>')
    + row('Dept / Bed', (patient.dept ? 'Dept ' + patient.dept : '—') + ' — ' + (patient.bedNum || '—'))
    + row('Last Admission Date', latestAdmDate)
    + row('Last Discharge Date', latestDisDate)
    + '</div>';

  // Admission history
  let histHtml = '';
  const adms = patient.admissions || [];
  adms.slice().reverse().forEach(function(adm, revI) {
    histHtml += '<details style="border-bottom:1px solid var(--border);padding:12px 0;">'
      + '<summary style="cursor:pointer;font-weight:600;padding:8px 0;">Visit ' + (adms.length - revI) + ' — ' + (adm.admDate || '—')
      + ' <span style="margin-left:8px;font-size:12px;color:var(--text2);">' + (adm.status || '') + '</span></summary>'
      + '<div style="margin-top:12px;padding:12px;background:var(--surface2);border-radius:8px;">'
      + row('Department', 'Dept ' + adm.dept)
      + row('Bed Number', 'Bed ' + adm.bedNum)
      + (adm.evals && adm.evals.length ? '<div style="margin-top:12px;font-weight:600;border-bottom:1px solid var(--border);padding-bottom:8px;">Evaluations</div>' : '')
      + (adm.evals && adm.evals.length ? adm.evals.slice().sort(function(a,b){ var ka=(a.date||a.datetime||'')+(a.time||''); var kb=(b.date||b.datetime||'')+(b.time||''); return kb.localeCompare(ka); }).map(function(e) {
          var dt = (e.date ? e.date + ' ' : '') + formatTime(e.time || e.datetime || '');
          return '<div class="row" style="margin:8px 0;"><div class="row-i"><div class="row-t">' + (e.by || '') + '</div>'
            + '<div class="row-s">' + (e.state || '') + ' — ' + (e.notes || e.obs || '').slice(0, 150) + ( (e.notes||e.obs) && (e.notes||e.obs).length > 150 ? '...' : '') + '</div></div>'
            + '<div style="font-size:11px;color:var(--text3);">' + dt + '</div></div>';
        }).join('') : '<div style="color:var(--text3);font-size:13px;padding:8px;">No evaluations.</div>')
      + '</div></details>';
  });
  if (!histHtml) histHtml = '<div style="color:var(--text3);padding:8px;">No admission history.</div>';

  html += '<div class="fs"><div class="fst">ADMISSION HISTORY</div>' + histHtml + '</div>';

  // Action buttons: Edit + Discharge
  var dischargeDisabled = patient.status && patient.status.toLowerCase() !== 'admitted';
  var dischargeLabel = dischargeDisabled ? 'Already Discharged' : 'Discharge Patient';
  var dischargeAttr = dischargeDisabled ? ' disabled style="cursor:not-allowed;opacity:.7;"' : ' onclick="dischargePatient(\'' + patient.id + '\')"';

  html += '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px;">'
    + '<button class="btn btn-p sm" onclick="editPatient(\'' + patient.id + '\')">Edit Patient Info</button>'
    + '<button class="btn btn-d sm" type="button"' + dischargeAttr + '>' + dischargeLabel + '</button>'
    + '</div>';

  document.getElementById('file-mo-body').innerHTML = html;

  // Open modal
  const mo = document.getElementById('file-mo');
  if (typeof openMo === 'function') openMo('file-mo');
  else mo.classList.add('open');
  mo.setAttribute('aria-hidden', 'false');
}

function editPatient(pid) {
  alert('Edit patient: ' + pid + '\n(Editing UI not implemented yet)');
}

function dischargePatient(pid) {
  alert('Discharge patient: ' + pid + '\n(Discharge logic not implemented yet)');
}

function goBack() {
  const mo = document.getElementById('file-mo');
  if (mo) {
    if (typeof closeMo === 'function') closeMo('file-mo');
    else mo.classList.remove('open');
    mo.setAttribute('aria-hidden', 'true');
  }

  if (!restoreSession()) {
    window.location.href = '../index.html';
    return;
  }

  const rolePages = {
    secretary: '../secretary/patients.html',
    doctor: '../doctor/patients.html',
    nurse: '../nurse/patients.html',
    admin: '../admin/statistics.html'
  };

  window.location.href = rolePages[curUser.role] || '../index.html';
}

// Init
if (!restoreSession()) throw new Error('Not authenticated');
loadPatientFile();
