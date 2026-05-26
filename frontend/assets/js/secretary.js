// ══════════════════════════════════════
// SECRETARY FUNCTIONS
// ══════════════════════════════════════

let apptPatMap = []; // rendered appt patient ids by list index

async function loadBeds(deptSelectId, bedSelectId) {
  const dept = document.getElementById(deptSelectId).value;
  const bedSel = document.getElementById(bedSelectId);
  if (!dept) {
    bedSel.innerHTML = '<option value="">— Select department first —</option>';
    return;
  }

  // Map wing letter to numeric department id used by backend
  const id_department = wingToDeptId(dept);
  if (!id_department) {
    bedSel.innerHTML = '<option value="">No beds available</option>';
    return;
  }

  try {
    const resp = await getAvailableBeds(id_department);
    const list = Array.isArray(resp.beds) ? resp.beds : [];
    if (!list.length) {
      bedSel.innerHTML = '<option value="">No beds available</option>';
      return;
    }

    const options = list.map(b => `<option value="${b.id_bed}">Bed ${b.roomNUM}</option>`).join('');
    bedSel.innerHTML = `<option value="">— Select Bed —</option>${options}`;
  } catch (err) {
    console.error('Failed to load beds:', err);
    bedSel.innerHTML = '<option value="">Error loading beds</option>';
  }
}

function toggleReturning() {
  const isReturning = document.getElementById('rf-returning').checked;
  document.getElementById('rf-new-section').style.display = isReturning ? 'none' : 'block';
  document.getElementById('rf-returning-section').style.display = isReturning ? 'block' : 'none';
  
  if (isReturning) {
    document.getElementById('rf-ret-id').value = '';
    document.getElementById('rf-ret-selected').style.display = 'none';
    document.getElementById('rf-readmit-form').style.display = 'none';
    document.getElementById('rf-ret-search').style.display = 'block';
    document.getElementById('rf-ret-list').style.display = 'block';
    renderRetPatList('');
  }
}

function renderRetPatList(q) {
  const filter = (q || '').toLowerCase();
  const list = patients.filter(p =>
    p.status === 'Discharged' &&
    (!filter || p.name.toLowerCase().includes(filter) || p.id.toLowerCase().includes(filter))
  );
  
  const box = document.getElementById('rf-ret-list');
  if (!list.length) {
    box.innerHTML = `<div style="padding:12px 14px;color:var(--text3);font-size:13px;">
      ${patients.some(p => p.status === 'Discharged') ? 'No results.' : 'No discharged patients yet.'}
    </div>`;
    return;
  }
  
  box.innerHTML = list.map(p => `
    <div onclick="selectRetPat('${p.id}')" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);font-size:13.5px;" 
         onmouseenter="this.style.background='var(--accent-light)'" onmouseleave="this.style.background=''">
      <div style="font-weight:600;">${p.name} <code style="font-size:11px;color:var(--text3);">${p.id}</code></div>
      <div style="font-size:11px;color:var(--text3);">Last discharged: ${p.dischargedOn || '—'}</div>
    </div>
  `).join('');
}

function selectRetPat(pid) {
  const p = patients.find(x => x.id === pid);
  if (!p) return;
  
  document.getElementById('rf-ret-id').value = pid;
  document.getElementById('rf-ret-selected').textContent = `${p.name} (${p.id})`;
  document.getElementById('rf-ret-selected').style.display = 'block';
  document.getElementById('rf-ret-list').style.display = 'none';
  document.getElementById('rf-ret-search').style.display = 'none';
  document.getElementById('rf-readmit-form').style.display = 'block';
}

async function submitReadmit() {
  const pid = document.getElementById('rf-ret-id').value;
  const p = patients.find(x => x.id === pid);
  const dept = document.getElementById('rf-ret-dept').value;
  const bedId = document.getElementById('rf-ret-bed').value;
  const dateRaw = document.getElementById('rf-ret-date').value.trim();

  if (!p) { showToast('Please select a patient.', 'err'); return; }
  if (!dept || !bedId) { showToast('Please select a department and bed.', 'err'); return; }
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateRaw)) { showToast('Admission date must be DD/MM/YYYY.', 'err'); return; }

  if (!p.backendId) { showToast('Cannot readmit: missing backend patient id.', 'err'); return; }

  try {
    const res = await readmitPatient(p.backendId, Number(bedId));
    showToast(res.message || `${p.name} re-admitted.`, 'ok');
    await loadBackendData();
    clearReg();
    refreshSecDash();
    try { renderSecPts(); } catch (e) {}
  } catch (err) {
    console.error('Readmit failed:', err);
    showToast(err.data?.message || err.message || 'Failed to readmit patient.', 'err');
  }
}

async function submitReg(e) {
  e.preventDefault();
  const fn = document.getElementById('rf1').value.trim();
  const ln = document.getElementById('rf2').value.trim();
  const dob = document.getElementById('rf3').value.trim();
  const gender = document.getElementById('rf4').value;
  const blood = document.getElementById('rf5').value;
  const phone = document.getElementById('rf6').value.trim();
  const addr = document.getElementById('rf7').value.trim();
  const dept = document.getElementById('rf-dept').value;
  const bedId = document.getElementById('rf-bed').value;
  const dateRaw = document.getElementById('rf-date').value.trim();

  if (!fn || !ln) { showToast('First and last name are required.', 'err'); return; }
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) { showToast('Date of birth must be DD/MM/YYYY.', 'err'); return; }
  if (!gender) { showToast('Please select a gender.', 'err'); return; }
  if (!blood) { showToast('Please select a blood type.', 'err'); return; }
  if (!phone) { showToast('Phone number is required.', 'err'); return; }
  if (!addr) { showToast('Home address is required.', 'err'); return; }
  if (!dept || !bedId) { showToast('Please select a department and bed.', 'err'); return; }
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateRaw)) { showToast('Admission date must be DD/MM/YYYY.', 'err'); return; }

  const admDate = dateToISO(dateRaw);

  // Build payload for backend
  const payload = {
    first_name: fn,
    last_name: ln,
    date_of_birth: dateToISO(dob),
    gender,
    blood_type: blood,
    phone,
    address: addr,
    allergies: document.getElementById('rf8').value || 'None',
    conditions: document.getElementById('rf9').value || 'None',
    id_bed: Number(bedId),
    id_secretary: curUser && curUser.id ? curUser.id : null
  };

  try {
    const res = await createPatient(payload);
    showToast(res.message || 'Patient registered successfully.', 'ok');
    // reload backend data and update UI
    await loadBackendData();
    clearReg();
    refreshSecDash();
    try { renderSecPts(); } catch (e) {}
  } catch (err) {
    console.error('Create patient failed:', err);
    showToast(err.data?.message || err.message || 'Failed to register patient.', 'err');
  }
}

function clearReg() {
  ['rf1', 'rf2', 'rf3', 'rf4', 'rf5', 'rf6', 'rf7', 'rf8', 'rf9', 'rf-date', 'rf-dept'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('rf-bed').innerHTML = '<option value="">— Select department first —</option>';
  const cb = document.getElementById('rf-returning');
  if (cb) {
    cb.checked = false;
    toggleReturning();
  }
}

function refreshSecDash() {
  const admitted = patients.filter(p => p.status === 'Admitted');
  const totalEl = document.getElementById('s-n-total');
  const admEl = document.getElementById('s-n-adm');
  if (totalEl) totalEl.textContent = patients.length;
  if (admEl) admEl.textContent = admitted.length;

  // Recent patients
  const recent = patients.slice(-4).reverse();
  const ptsEl = document.getElementById('s-dash-pts');
  if (!ptsEl) return; // dashboard elements not present on this page
  ptsEl.innerHTML = recent.length
    ? recent.map(p => `
        <div class="row">
          <div class="row-i">
            <div class="row-t">${p.name} <code style="font-size:11px;color:var(--text3);">${p.id}</code></div>
            <div class="row-s">Dept ${p.dept} — Bed ${p.bedNum || '—'}</div>
          </div>
          <span class="badge ${p.status === 'Admitted' ? 'b-g' : 'b-gr'}">${p.status}</span>
        </div>
      `).join('')
    : '<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px;">No patients yet.</div>';

  // Bed summary
  const roomsEl = document.getElementById('s-dash-rooms');
  if (!roomsEl) return; // bed summary element not present
  const total = Object.values(DEPTS).reduce((a, d) => a + d.beds, 0);
  const occ = admitted.length;
  roomsEl.innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      <div style="flex:1;background:var(--danger-light);border:1.5px solid var(--danger);border-radius:10px;padding:14px;text-align:center;">
        <div style="font-family:'DM Serif Display',serif;font-size:26px;color:var(--danger);">${occ}</div>
        <div style="font-size:12px;color:var(--danger);font-weight:600;">Occupied</div>
      </div>
      <div style="flex:1;background:var(--success-light);border:1.5px solid var(--success);border-radius:10px;padding:14px;text-align:center;">
        <div style="font-family:'DM Serif Display',serif;font-size:26px;color:var(--success);">${total - occ}</div>
        <div style="font-size:12px;color:var(--success);font-weight:600;">Available</div>
      </div>
      <div style="flex:1;background:var(--surface2);border:1.5px solid var(--border);border-radius:10px;padding:14px;text-align:center;">
        <div style="font-family:'DM Serif Display',serif;font-size:26px;color:var(--text);">${total}</div>
        <div style="font-size:12px;color:var(--text2);font-weight:600;">Total Beds</div>
      </div>
    </div>
  `;
}

function renderSecPts(searchId = 's-search') {
  const q = (document.getElementById(searchId)?.value || '').toLowerCase();
  const list = patients.filter(p => !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  const tb = document.getElementById('s-ptbody');
  
  if (!list.length) {
    tb.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:24px;">
      ${patients.length ? 'No results.' : 'No patients registered yet.'}
    </td></tr>`;
    return;
  }
  
  tb.innerHTML = list.map(p => `
    <tr>
      <td><code style="font-size:11px;color:var(--text3);">${p.id}</code></td>
      <td><b>${p.name}</b></td>
      <td>${p.dept !== '—' ? 'Dept ' + p.dept : '—'}</td>
      <td>${p.bedNum && p.bedNum !== '—' ? 'Bed ' + p.bedNum : '—'}</td>
      <td>${p.admitted}</td>
      <td><span class="badge ${p.status === 'Admitted' ? 'b-g' : 'b-gr'}">${p.status}</span></td>
      <td><button class="btn btn-o sm" onclick="openPatientFile('${p.id}')">View File</button></td>
    </tr>
  `).join('');
}

function secRow(label, value) {
  return '<div class="prow"><div class="prl">' + label + '</div><div class="prv">' + value + '</div></div>';
}

function openPatientFile(id, mode) {
  const target = String(id || '').trim();
  const lowerTarget = target.toLowerCase();
  var p = patients.find(function(x) {
    return String(x.id || '').trim().toLowerCase() === lowerTarget;
  });
  if (!p && target) {
    p = patients.find(function(x) {
      return String(x.name || '').trim().toLowerCase() === lowerTarget;
    });
  }
  if (!p && target) {
    p = patients.find(function(x) {
      return String(x.name || '').trim().toLowerCase().includes(lowerTarget);
    });
  }
  if (!p) { showToast('Patient not found: ' + target, 'err'); return; }

  var html = '';
  mode = mode || 'view';

  if (mode === 'view') {
    var latestAdm = (p.admissions && p.admissions.length) ? p.admissions[p.admissions.length - 1] : null;
    var latestAdmDate = latestAdm ? (latestAdm.admDate || '—') : '—';
    var latestDisDate = latestAdm ? (latestAdm.dischargedOn || 'Active') : '—';
    var isAdmitted = (/^admitted$/i).test(p.status || '');
    var statusLabel = '<span class="badge ' + (isAdmitted ? 'b-g' : 'b-gr') + '">' + (p.status || '—') + '</span>';

    html = '<div class="fs"><div class="fst">Personal Information</div>'
      + secRow('Full Name', '<b>' + p.name + '</b> <code style="font-size:11px;">' + p.id + '</code>')
      + secRow('Date of Birth', p.dob) + secRow('Gender', p.gender) + secRow('Blood Type', p.blood)
      + secRow('Phone', p.phone) + secRow('Address', p.address)
      + secRow('Allergies', p.allergies) + secRow('Conditions', p.conditions) + '</div>'
      + '<div class="fs"><div class="fst">Admission Status</div>'
      + secRow('Status', statusLabel)
      + (isAdmitted ? secRow('Dept / Bed', 'Dept ' + p.dept + ' — Bed ' + p.bedNum) : '')
      + secRow('Last Admission Date', latestAdmDate) + secRow('Last Discharge Date', latestDisDate)
      + '</div>'
      + '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px;">'
      + '<button class="btn btn-p sm" onclick="openPatientFile(\'' + id + '\',\'edit\')">Edit Patient Info</button>'
      + '<button class="btn btn-d sm" type="button"' + (isAdmitted ? ' onclick="document.getElementById(\'dis-panel-' + id + '\').style.display=\'block\'\"' : ' disabled style="cursor:not-allowed;opacity:.7;"') + '>' + (isAdmitted ? 'Discharge Patient' : 'Already Discharged') + '</button>'
      + '</div>'
      + '<div id="dis-panel-' + id + '" style="display:none;margin-top:16px;padding:16px;border:1.5px solid var(--danger);border-radius:10px;background:var(--danger-light);">'
      + '<div style="font-weight:700;color:var(--danger);margin-bottom:12px;">Discharge ' + p.name + '</div>'
      + '<div class="fgr"><label>Discharge Date</label><input type="text" id="dp-date-' + id + '" placeholder="DD/MM/YYYY" maxlength="10" oninput="fmtDate(this)"/></div>'
      + '<div style="display:flex;gap:8px;margin-top:12px;">'
      + '<button type="button" class="btn btn-o sm" onclick="document.getElementById(\'dis-panel-' + id + '\').style.display=\'none\'">Cancel</button>'
      + '<button type="button" class="btn btn-d sm" onclick="confirmDischarge(\'' + id + '\')">Confirm Discharge</button>'
      + '</div></div>';
  } else {
    var bloodOpts = ['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(function(b) {
      return '<option ' + (b === p.blood ? 'selected' : '') + '>' + b + '</option>';
    }).join('');

    var splitName = p.name.split(' ');
    var firstName = splitName[0];
    var lastName = splitName.slice(1).join(' ');

    html = '<div class="fg">'
      + '<div class="fgr"><label>First Name</label><input id="ef-fn" value="' + firstName + '"/></div>'
      + '<div class="fgr"><label>Last Name</label><input id="ef-ln" value="' + lastName + '"/></div>'
      + '<div class="fgr"><label>Phone</label><input id="ef-ph" value="' + p.phone + '"/></div>'
      + '<div class="fgr"><label>Blood Type</label><select id="ef-bl">' + bloodOpts + '</select></div>'
      + '<div class="fgr full"><label>Address</label><input id="ef-ad" value="' + p.address + '"/></div>'
      + '<div class="fgr"><label>Allergies</label><input id="ef-al" value="' + p.allergies + '"/></div>'
      + '<div class="fgr"><label>Conditions</label><input id="ef-co" value="' + p.conditions + '"/></div>'
      + '</div>'
      + '<div class="fa"><button type="button" class="btn btn-o sm" onclick="openPatientFile(\'' + id + '\',\'view\')">Cancel</button><button type="button" class="btn btn-p sm" onclick="saveFile(\'' + id + '\')">Save</button></div>';
  }

  document.getElementById('sec-file-mo-body').innerHTML = html;
  openMo('sec-file-mo');
}

async function saveFile(id) {
  var p = patients.find(function(x) { return x.id === id; });
  if (!p) return;
  var firstName = document.getElementById('ef-fn').value.trim();
  var lastName = document.getElementById('ef-ln').value.trim();
  var phone = document.getElementById('ef-ph').value;
  var blood = document.getElementById('ef-bl').value;
  var address = document.getElementById('ef-ad').value;
  var allergies = document.getElementById('ef-al').value;
  var conditions = document.getElementById('ef-co').value;

  if (!p.backendId) {
    showToast('Cannot update patient information: backend patient id is missing.', 'err');
    return;
  }

  try {
    await updatePatient(p.backendId, {
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      blood_type: blood,
      address: address,
      allergies: allergies,
      conditions: conditions
    });

    showToast('Patient information updated.', 'ok');
    await loadBackendData();
    refreshSecDash(); renderBeds();
    if (document.getElementById('s-ptbody')) renderSecPts();
    openPatientFile(id, 'view');
  } catch (error) {
    console.error('Update patient failed:', error);
    showToast(error.data?.message || error.message || 'Failed to update patient information.', 'err');
  }
}

function confirmDischarge(id) {
  var p = patients.find(function(x) { return x.id === id; });
  if (!p) return;
  var raw = document.getElementById('dp-date-' + id) ? document.getElementById('dp-date-' + id).value : '';
  var date = new Date().toISOString().slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) date = dateToISO(raw);

  if (!p.backendId) {
    showToast('Cannot discharge patient: backend patient id is missing.', 'err');
    return;
  }

  // call backend discharge
  dischargePatient(p.backendId).then(res => {
    showToast(res.message || (p.name + ' discharged.'), 'ok');
    closeMo('sec-file-mo');
    loadBackendData().then(() => {
      refreshSecDash(); renderBeds();
      if (document.getElementById('s-ptbody')) renderSecPts();
    }).catch(e => {
      console.error('Reload after discharge failed:', e);
    });
  }).catch(err => {
    console.error('Discharge failed:', err);
    showToast(err.data?.message || err.message || 'Failed to discharge patient.', 'err');
  });
}

function goToNav(pageId, el) {
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');

  document.querySelectorAll('.pg').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById(pageId);
  if (pg) pg.classList.add('active');

  if (pageId === 's-dash') refreshSecDash();
  if (pageId === 's-patients') renderSecPts();
  if (pageId === 's-appts') renderSecAppts();
}

function renderSecAppts(q = '') {
  const filter = (q || '').toLowerCase();
  const list = appointments.filter(a => !filter || a.patName.toLowerCase().includes(filter) || a.docName.toLowerCase().includes(filter));

  // Sort by date and time
  list.sort((a, b) => a.date.localeCompare(b.date) || a.from.localeCompare(b.from));

  const tb = document.getElementById('s-appts-body');
  if (!list.length) {
    tb.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:24px;">No appointments scheduled.</td></tr>';
    return;
  }

  let lastGroup = '';
  tb.innerHTML = list.map(a => {
    const today = new Date().toISOString().slice(0, 10);
    const grp = a.date === today ? 'Today' : a.date > today ? 'Upcoming' : 'Past';
    const sep = grp !== lastGroup ? `<tr><td colspan="7" style="padding:8px 12px 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:${grp === 'Today' ? 'var(--success)' : grp === 'Upcoming' ? 'var(--accent)' : 'var(--text3)'};border-bottom:2px solid ${grp === 'Today' ? 'var(--success)' : grp === 'Upcoming' ? 'var(--accent)' : 'var(--text3)'};">${grp}</td></tr>` : '';
    lastGroup = grp;
    return sep + `<tr>
      <td>${a.date === today ? 'Today' : a.date}</td>
      <td>${a.from}–${a.to}</td>
      <td><b>${a.patName}</b></td>
      <td>Dr. ${a.docName}</td>
      <td>${a.type}</td>
      <td>Dept ${a.dept}</td>
      <td><button class="btn btn-p sm" onclick="openPatientFile('${a.patId}')">Patient File</button></td>
    </tr>`;
  }).join('');
}

async function scheduleAppt(e) {
  if (e && e.preventDefault) e.preventDefault();
  const patId = document.getElementById('appt-pat').value;
  const docId = parseInt(document.getElementById('appt-doc').value);
  const date = document.getElementById('appt-date').value;
  const from = document.getElementById('appt-from').value;
  const type = document.getElementById('appt-type').value;

  if (!patId || !docId || !date || !from || !type) {
    showToast('Please fill all fields.', 'err');
    return;
  }

  const patient = patients.find(p => p.id === patId);
  const doctor = staff.find(s => s.backendId === docId);

  if (!patient) { showToast('Patient not found.', 'err'); return; }
  if (!doctor) { showToast('Doctor not found.', 'err'); return; }

  // Check for conflicts locally first
  const conflict = appointments.find(a =>
    a.docId === docId && a.date === date && a.from === from
  );

  if (conflict) {
    showToast('Doctor already has an appointment at this time.', 'err');
    return;
  }

  // Build backend payload
  const payload = {
    appt_date: date,
    appt_time: from,
    type: type,
    id_patient: patient.backendId ?? null,
    id_doctor: doctor.backendId ?? null,
    id_secretary: curUser?.id ?? null
  };

  try {
    const res = await createAppointment(payload);
    showToast(res.message || 'Appointment scheduled.', 'ok');
    await loadBackendData();
    updSched();
    return false;
  } catch (err) {
    console.error('Schedule appointment failed:', err);
    showToast(err.data?.message || err.message || 'Failed to schedule appointment.', 'err');
  }
}

function searchApptPats(q) {
  const filter = (q || '').toLowerCase();
  const list = patients.filter(p =>
    !filter || p.name.toLowerCase().includes(filter) || p.id.toLowerCase().includes(filter)
  );

  const box = document.getElementById('appt-pat-list');
  if (!list.length) {
    box.innerHTML = '<div style="padding:12px 14px;color:var(--text3);font-size:13px;">No results.</div>';
    apptPatMap = [];
    return;
  }

  apptPatMap = list.map(p => p.id);
  box.innerHTML = list.map(p => `
    <div class="appt-pat-item" data-id="${p.id}" onclick="selectApptPat('${p.id}')" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);font-size:13.5px;" 
         onmouseenter="this.style.background='var(--accent-light)'" onmouseleave="this.style.background=''">
      <div style="font-weight:600;">${p.name} <code style="font-size:11px;color:var(--text3);">${p.id}</code></div>
      <div style="font-size:11px;color:var(--text3);">Dept ${p.dept} — Bed ${p.bedNum || '—'}</div>
    </div>
  `).join('');
}

function renderApptPatList(q = '') {
  searchApptPats(q);
}

function clearPatSel() {
  document.getElementById('appt-pat').value = '';
  document.getElementById('appt-selected-name').textContent = '—';
  document.getElementById('appt-pat-selected').style.display = 'none';
  document.getElementById('appt-pat-picker').style.display = 'block';
  document.getElementById('appt-pat-search').style.display = 'block';
  document.getElementById('appt-pat-list').style.display = 'block';
  document.getElementById('appt-pat-search').value = '';
  renderApptPatList('');
}

function updSched() {
  const date = document.getElementById('appt-date').value;
  const docId = parseInt(document.getElementById('appt-doc').value);
  const panel = document.getElementById('sched-panel');
  const tit = document.getElementById('sched-title');
  const bdg = document.getElementById('sched-badge');
  
  if (!date) {
    panel.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text3);font-size:13px;">Select a date to view appointments.</div>';
    return;
  }
  
  if (!docId || isNaN(docId)) {
    panel.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text3);font-size:13px;">Select a doctor to view appointments.</div>';
    return;
  }

  // Filter appointments by date AND selected doctor ID
  const list = appointments.filter(a => a.date === date && a.docId === docId);
  
  tit.textContent = 'Appointments — ' + new Date(date).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  bdg.className = list.length ? 'badge b-b' : '';
  bdg.textContent = list.length ? list.length + ' appt' + (list.length > 1 ? 's' : '') : '';
  panel.innerHTML = list.length
    ? list.map(a => `
        <div class="row">
          <div class="row-d">${formatTime(a.from)}</div>
          <div class="row-i">
            <div class="row-t">${a.patName}</div>
            <div class="row-s">${a.type}</div>
          </div>
        </div>
      `).join('')
    : '<div style="text-align:center;padding:24px;color:var(--text3);font-size:13px;">No appointments on this date.</div>';
}

function selectApptPat(pid) {
  console.log('selectApptPat pid=', pid);
  const p = patients.find(x => x.id === pid);
  console.log('selectApptPat found:', p);
  if (!p) return;

  document.getElementById('appt-pat').value = pid;
  document.getElementById('appt-selected-name').textContent = `${p.name} (${p.id})`;
  document.getElementById('appt-pat-selected').style.display = 'flex';
  document.getElementById('appt-pat-picker').style.display = 'none';
  document.getElementById('appt-pat-list').style.display = 'none';
  document.getElementById('appt-pat-search').style.display = 'none';
  try { showToast(`Selected: ${p.name} (${p.id})`, 'ok', 2500); } catch (e) { /* ignore */ }
}

window.selectApptPat = selectApptPat;
window.renderApptPatList = renderApptPatList;
window.clearPatSel = clearPatSel;

