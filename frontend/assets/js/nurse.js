// ══════════════════════════════════════
// NURSE FUNCTIONS
// ══════════════════════════════════════

function refreshNurseDash() {
  const mine = patients.filter(p => p.dept === curUser.wing && p.status === 'Admitted');
  document.getElementById('n-n-pts').textContent = mine.length;

  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = appointments.filter(a => a.dept === curUser.wing && a.date === today)
    .sort((a, b) => a.from.localeCompare(b.from));

  document.getElementById('n-dash-tasks').innerHTML = todayTasks.length
    ? todayTasks.map(a => `
        <div class="row">
          <div class="row-d">${a.from}–${a.to}</div>
          <div class="row-i">
            <div class="row-t">${a.patName}</div>
            <div class="row-s">${a.type} — ${a.docName}</div>
          </div>
        </div>
      `).join('')
    : '<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px;">No tasks today.</div>';
}

function parseNurseDateTime(record) {
  if (!record) return 0;
  if (record.date && record.time) {
    var dt = new Date(record.date + 'T' + record.time + ':00');
    if (!isNaN(dt)) return dt.getTime();
  }
  if (record.datetime) {
    var dt2 = new Date(record.datetime);
    if (!isNaN(dt2)) return dt2.getTime();
  }
  if (record.time) {
    var dt3 = new Date('1970-01-01T' + record.time + ':00');
    if (!isNaN(dt3)) return dt3.getTime();
  }
  if (record.date) {
    var dt4 = new Date(record.date);
    if (!isNaN(dt4)) return dt4.getTime();
  }
  return 0;
}

function formatNurseDateTime(record) {
  if (record.date && record.time) return record.date + ' ' + record.time;
  if (record.datetime) return record.datetime;
  if (record.time) return record.time;
  return '—';
}

function renderNursePts(q = '') {
  const filter = (q || '').toLowerCase();
  const list = patients.filter(p => p.dept === curUser.wing && p.status === 'Admitted' && (!filter || p.name.toLowerCase().includes(filter) || p.id.toLowerCase().includes(filter)));
  const tb = document.getElementById('n-ptbody');

  if (!list.length) {
    tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:24px;">No patients in your department.</td></tr>';
    return;
  }

  tb.innerHTML = list.map(p => `
    <tr>
      <td><code style="font-size:11px;color:var(--text3);">${p.id}</code></td>
      <td><b>${p.name}</b></td>
      <td>Dept ${p.dept}</td>
      <td>${p.bedNum && p.bedNum !== '—' ? 'Bed ' + p.bedNum : '—'}</td>
      <td>${p.admitted}</td>
      <td><button class="btn btn-p sm" onclick="openNursePatientFile('${p.id}')">Medical File</button></td>
    </tr>
  `).join('');
}

function nurseRow(label, value) {
  return '<div class="prow"><div class="prl">' + label + '</div><div class="prv">' + value + '</div></div>';
}

async function openNursePatientFile(id) {
  var p = patients.find(function(x) { return x.id === id; });
  if (!p) { showToast('Patient not found.', 'err'); return; }

  try {
    await loadPatientHistory(id);
  } catch (error) {
    console.error('Failed to load patient history:', error);
  }

  var html = '';

// Build admission history grouped by type (evaluations, prescriptions, vitals) across all admissions
  var adms = p.admissions || [];
  var admHtml = '';
  
  // Collect all evaluations from all admissions
  var allEvals = [];
  adms.forEach(function(adm) {
    if (adm.evals && adm.evals.length) {
      allEvals = allEvals.concat(adm.evals);
    }
  });
  
  // Collect all prescriptions from all admissions
  var allTx = [];
  var txAdmIndex = {}; // Map tx to its admission index for data attributes
  adms.forEach(function(adm, admIdx) {
    if (adm.tx && adm.tx.length) {
      adm.tx.forEach(function(t, txIdx) {
        allTx.push({tx: t, admIdx: admIdx, txIdx: txIdx});
        txAdmIndex[allTx.length - 1] = {admIdx: admIdx, txIdx: txIdx};
      });
    }
  });
  
  // Collect all vitals from all admissions
  var allVitals = [];
  adms.forEach(function(adm) {
    if (adm.vitals && adm.vitals.length) {
      allVitals = allVitals.concat(adm.vitals);
    }
  });
  
  // Display Clinical Evaluations
  admHtml += '<div class="fs"><div class="fst">Clinical Evaluations</div>';
  if (allEvals.length) {
    allEvals.sort(function(a, b) { var ka=(a.date||a.datetime||'')+(a.time||''); var kb=(b.date||b.datetime||'')+(b.time||''); return kb.localeCompare(ka); }).forEach(function(ev) {
      var dt = (ev.date ? ev.date + ' ' : '') + (ev.time || ev.datetime || '');
      admHtml += '<div style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;">'  
        + '<div style="font-size:10px;color:var(--text3);margin-bottom:6px;font-weight:600;">' + (dt || '—') + ' — by ' + (ev.by || '—') + ' · <span class="badge b-b" style="font-size:10px;">' + (ev.state || 'pending') + '</span></div>'
        + '<div style="font-size:13.5px;white-space:pre-wrap;">' + (ev.notes || ev.obs || '') + '</div></div>';
    });
  } else { admHtml += '<div style="color:var(--text3);font-size:13px;padding:8px;">No clinical evaluations recorded.</div>'; }
  admHtml += '</div>';
  
  // Thin separator line
  admHtml += '<div style="height:1px;background:var(--border);margin:16px 0;"></div>';
  
  // Display Prescriptions & Care
  admHtml += '<div class="fs"><div class="fst">Prescriptions &amp; Care</div>';
  if (allTx.length) {
    allTx.sort(function(a, b) {
      var aKey = a.tx.prescribedAt ? new Date(a.tx.prescribedAt).toISOString() : (a.tx.date || '');
      var bKey = b.tx.prescribedAt ? new Date(b.tx.prescribedAt).toISOString() : (b.tx.date || '');
      return bKey.localeCompare(aKey);
    }).forEach(function(item, listIdx) {
      var t = item.tx;
      var admIdx = item.admIdx;
      var txIdx = item.txIdx;
      var prescribedLabel = t.prescribedAt ? new Date(t.prescribedAt).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : (t.date || '—');
      admHtml += '<div style="border:1.5px solid var(--border);border-radius:10px;padding:14px;margin-bottom:12px;background:var(--surface);">'  
        + '<div style="margin-bottom:8px;"><span style="font-weight:700;font-size:14px;">' + (t.med || '') + ' ' + (t.dose||'') + '</span>'
        + ' <span style="font-size:12px;color:var(--text3);margin-left:6px;">' + (t.freqLabel||t.freq||'') + ' — ' + (t.durDays||t.dur||'') + ' day(s)</span></div>'
        + '<div style="font-size:11px;color:var(--text3);margin-bottom:8px;">Prescribed by ' + (t.by || '—') + ' on ' + prescribedLabel + '</div>';
      if (t.doses && t.doses.length) {
        admHtml += '<div style="display:flex;flex-direction:column;gap:4px;">';
        t.doses.forEach(function(d, di) {
          var doneStyle = 'background:' + (d.done ? 'rgba(26,122,74,.08)' : 'var(--surface2)') + ';border:1px solid ' + (d.done ? 'var(--success)' : 'var(--border)') + ';';
          var checkStyle = 'width:22px;height:22px;border-radius:5px;border:2px solid ' + (d.done ? 'var(--success)' : 'var(--border)') + ';background:' + (d.done ? 'var(--success)' : 'transparent') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;font-size:13px;';
          admHtml += '<div style="display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:7px;' + doneStyle + '">'
            + '<div style="' + checkStyle + 'cursor:pointer;" data-pf-id="' + id + '" data-treatment-id="' + d.id_treatment + '">' + (d.done ? 'v' : '') + '</div>'
            + '<div style="flex:1;"><span style="font-size:12px;font-weight:600;color:var(--text2);">' + (d.label || '') + '</span> <span style="font-size:12px;color:var(--text3);">' + (d.datetime || '') + '</span></div>'
            + (d.done ? '<span style="font-size:11px;color:var(--success);font-weight:600;">Done — ' + (d.doneBy || '') + '</span>' : '')
            + '</div>';
        });
        admHtml += '</div>';
      }
      admHtml += '</div>';
    });
  } else { admHtml += '<div style="color:var(--text3);font-size:13px;padding:8px;">No prescriptions recorded.</div>'; }
  admHtml += '</div>';
  
  // Thin separator line
  admHtml += '<div style="height:1px;background:var(--border);margin:16px 0;"></div>';
  
  // Display Vital Signs
  admHtml += '<div class="fs"><div class="fst">Vital Signs</div>';
  if (allVitals.length) {
    allVitals.sort(function(a, b) { return parseNurseDateTime(b) - parseNurseDateTime(a); }).forEach(function(v) {
      var dateTimeStr = formatNurseDateTime(v);
      admHtml += '<div style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;">'  
        + '<div style="font-size:10px;color:var(--text3);margin-bottom:6px;font-weight:600;">' + (v.nurse || '—') + ' — ' + dateTimeStr + '</div>'
        + '<div style="font-size:12px;">HR: ' + (v.hr || '—') + ' bpm | BP: ' + (v.bp || '—') + ' | Temp: ' + (v.temp || '—') + '°C | SpO2: ' + (v.spo2 || '—') + '%</div></div>';
    });
  } else { admHtml += '<div style="color:var(--text3);font-size:13px;padding:8px;">No vital signs recorded.</div>'; }
  admHtml += '</div>';
  
  if (!allEvals.length && !allTx.length && !allVitals.length) admHtml = '<div style="color:var(--text3);padding:8px;">No admission history.</div>';

  html = '<div class="tab-bar" style="margin-bottom:14px;">'
    + '<div class="tab active" onclick="switchNFT(this,\'nft-main\')">Patient File</div>'
    + '<div class="tab" onclick="switchNFT(this,\'nft-vitals\')">Record Vital Signs</div>'
    + '</div>'
    + '<div id="nft-main">'
    + '<div class="fs"><div class="fst">Patient Information</div>'
    + nurseRow('Name', '<b>' + p.name + '</b> <code style="font-size:11px;">' + p.id + '</code>')
    + nurseRow('DOB / Gender', p.dob + ' — ' + p.gender)
    + nurseRow('Blood Type', p.blood) + nurseRow('Allergies', p.allergies) + nurseRow('Conditions', p.conditions)
    + nurseRow('Department / Bed', 'Dept ' + p.dept + ' — Bed ' + (p.bedNum || '—'))
    + nurseRow('Admission Date', p.admitted)
    + '</div>'
    + '<div class="fs"><div class="fst">Admission History</div>' + admHtml + '</div>'
    + '</div>'

    + '<div id="nft-vitals" style="display:none;">'
    + '<div class="fg"><div class="fgr"><label>Nurse Name *</label><input id="nvt-nurse" placeholder="Enter your full name"/></div>'
    + '<div class="fgr"><label>Heart Rate (bpm) *</label><input type="text" inputmode="numeric" id="nvt-hr" placeholder="e.g. 78"/></div>'
    + '<div class="fgr"><label>Blood Pressure *</label><input id="nvt-bp" placeholder="e.g. 120/80"/></div>'
    + '<div class="fgr"><label>Temperature (°C) *</label><input type="text" inputmode="decimal" id="nvt-temp" placeholder="e.g. 37.2"/></div>'
    + '<div class="fgr"><label>SpO2 (%) *</label><input type="text" inputmode="numeric" id="nvt-spo2" placeholder="e.g. 98"/></div>'
    + '</div><div class="fa"><button type="button" class="btn btn-p sm" onclick="saveNurseVitals(\'' + id + '\')">Save Vitals</button></div></div>';

  document.getElementById('nur-file-mo-title').textContent = 'Patient File';
  document.getElementById('nur-file-mo-body').innerHTML = html;
  openMo('nur-file-mo');

  // Delegate dose checkbox clicks (nurse only)
  document.getElementById('nur-file-mo-body').onclick = function(e) {
    var btn = e.target.closest('[data-treatment-id]');
    if (btn) toggleNurseDose(btn.dataset.pfId, parseInt(btn.dataset.treatmentId, 10));
  };
}

function switchNFT(el, show) {
  var body = document.getElementById('nur-file-mo-body');
  body.querySelectorAll('.tab-bar .tab').forEach(function(t) { t.classList.remove('active'); });
  if (el) el.classList.add('active');
  body.querySelectorAll('[id^="nft-"]').forEach(function(d) { d.style.display = 'none'; });
  var target = document.getElementById(show);
  if (target) target.style.display = 'block';
}

async function saveNurseVitals(id) {
  var p = patients.find(function(x) { return x.id === id; });
  if (!p) return;
  
  var nurseVal = document.getElementById('nvt-nurse').value.trim();
  var hrVal = document.getElementById('nvt-hr').value.trim();
  var bpVal = document.getElementById('nvt-bp').value.trim();
  var tempVal = document.getElementById('nvt-temp').value.trim();
  var spo2Val = document.getElementById('nvt-spo2').value.trim();
  
  if (!nurseVal || !hrVal || !bpVal || !tempVal || !spo2Val) {
    showToast('Please fill all required fields.', 'err');
    return;
  }
  
  if (!p.admissions || !p.admissions.length) {
    showToast('No active admission.', 'err');
    return;
  }

  if (!curUser || !curUser.id) {
    showToast('User session expired. Please log in again.', 'err');
    return;
  }

  try {
    await createVitals({
      heart_rate: hrVal,
      blood_pressure: bpVal,
      temperature: tempVal,
      spo2: spo2Val,
      id_patient: p.backendId,
      id_nurse: curUser.id
    });

    showToast('Vital signs recorded.', 'ok');
    document.getElementById('nvt-nurse').value = '';
    document.getElementById('nvt-hr').value = '';
    document.getElementById('nvt-bp').value = '';
    document.getElementById('nvt-temp').value = '';
    document.getElementById('nvt-spo2').value = '';
    await loadPatientHistory(id);
    await openNursePatientFile(id);
  } catch (error) {
    console.error('Save vitals failed:', error);
    showToast(error.data?.message || error.message || 'Failed to record vitals.', 'err');
  }
}

async function toggleNurseDose(patId, treatmentId) {
  var p = patients.find(function(x) { return x.id === patId; });
  if (!p) return;

  var found = findDoseByTreatmentId(p, treatmentId);
  if (!found || !found.dose) return;
  var dose = found.dose;

  if (dose.done) {
    showToast('This dose is already marked as done.', 'err');
    return;
  }

  if (!curUser || !curUser.id) {
    showToast('User session expired. Please log in again.', 'err');
    return;
  }

  try {
    await markDoseDone(treatmentId, curUser.id);
    dose.done = true;
    dose.doneBy = curUser.name;
    showToast('Dose marked as done.', 'ok');
    await loadPatientHistory(patId);
    await openNursePatientFile(patId);
  } catch (error) {
    console.error('Mark dose failed:', error);
    showToast(error.data?.message || error.message || 'Failed to mark dose done.', 'err');
  }
}

function goToNurse(pageId, el) {
  document.querySelectorAll('.pg').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById(pageId);
  if (pg) pg.classList.add('active');

  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');

  if (pageId === 'n-dash') refreshNurseDash();
  if (pageId === 'n-patients') renderNursePts();
  if (pageId === 'n-profile') {
    // Fill profile info when profile page is shown
    document.getElementById('n-prof-name').textContent = curUser.name;
    document.getElementById('n-prof-sub').textContent = 'Dept ' + curUser.wing + ' — ' + (DEPTS[curUser.wing] ? DEPTS[curUser.wing].dept : '');
  }
}
