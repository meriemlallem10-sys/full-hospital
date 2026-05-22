// ══════════════════════════════════════
// DOCTOR FUNCTIONS
// ══════════════════════════════════════

function refreshDocDash() {
  const mine = patients.filter(p => p.dept === curUser.wing && p.status === 'Admitted');
  document.getElementById('d-n-pts').textContent = mine.length;

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = appointments.filter(a => a.docId === curUser.id && a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.from.localeCompare(b.from))
    .slice(0, 5);

  document.getElementById('d-dash-appts').innerHTML = upcoming.length
    ? upcoming.map(a => `
        <div class="row">
          <div class="row-d">${a.date === today ? 'Today' : a.date}</div>
          <div class="row-i">
            <div class="row-t">${a.patName}</div>
            <div class="row-s">${a.from}–${a.to} — ${a.type}</div>
          </div>
        </div>
      `).join('')
    : '<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px;">No upcoming appointments.</div>';
}

function renderDocAppts(q = '') {
  const filter = (q || '').toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  const myAppts = appointments.filter(a => a.docId === curUser.id && (!filter || a.patName.toLowerCase().includes(filter)));

  // Sort: upcoming first, then past
  myAppts.sort((a, b) => {
    const aPast = a.date < today, bPast = b.date < today;
    if (aPast === bPast) return aPast ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date) || a.from.localeCompare(b.from);
    return aPast ? 1 : -1;
  });

  const tb = document.getElementById('d-appts-body');
  if (!myAppts.length) {
    tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:24px;">No appointments yet.</td></tr>';
    return;
  }

  let lastGroup = '';
  tb.innerHTML = myAppts.map(a => {
    const p = patients.find(x => x.id === a.patId);
    const grp = a.date === today ? 'Today' : a.date > today ? 'Upcoming' : 'Past';
    const sep = grp !== lastGroup ? `<tr><td colspan="6" style="padding:8px 12px 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:${grp === 'Today' ? 'var(--success)' : grp === 'Upcoming' ? 'var(--accent)' : 'var(--text3)'};border-bottom:2px solid ${grp === 'Today' ? 'var(--success)' : grp === 'Upcoming' ? 'var(--accent)' : 'var(--text3)'};">${grp}</td></tr>` : '';
    lastGroup = grp;
    return sep + `<tr>
      <td>${a.date === today ? 'Today' : a.date}</td>
      <td>${a.from}–${a.to}</td>
      <td><b>${a.patName}</b></td>
      <td>${a.type}</td>
      <td>${p && p.bedNum && p.bedNum !== '—' ? 'Bed ' + p.bedNum : '—'}</td>
      <td><button class="btn btn-p sm" onclick="openDocPatientFile('${a.patId}')">File</button></td>
    </tr>`;
  }).join('');
}

function renderDocPts(q = '') {
  const filter = (q || '').toLowerCase();
  const list = patients.filter(p => p.dept === curUser.wing && p.status === 'Admitted' && (!filter || p.name.toLowerCase().includes(filter) || p.id.toLowerCase().includes(filter)));
  const tb = document.getElementById('d-ptbody');

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
      <td><button class="btn btn-p sm" onclick="openDocPatientFile('${p.id}')">Medical File</button></td>
    </tr>
  `).join('');
}

function docRow(label, value) {
  return '<div class="prow"><div class="prl">' + label + '</div><div class="prv">' + value + '</div></div>';
}

async function openDocPatientFile(id) {
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
  adms.forEach(function(adm, admIdx) {
    if (adm.tx && adm.tx.length) {
      adm.tx.forEach(function(t, txIdx) {
        allTx.push({tx: t, admIdx: admIdx, txIdx: txIdx});
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
        + '<div style="font-size:11px;color:var(--text3);margin-bottom:6px;font-weight:600;">' + (dt || '—') + ' — by ' + (ev.by || '—') + ' · <span class="badge b-b" style="font-size:10px;">' + (ev.state || 'pending') + '</span></div>'
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
    }).forEach(function(item) {
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
        t.doses.forEach(function(d) {
          var doneStyle = 'background:' + (d.done ? 'rgba(26,122,74,.08)' : 'var(--surface2)') + ';border:1px solid ' + (d.done ? 'var(--success)' : 'var(--border)') + ';';
          var checkStyle = 'width:22px;height:22px;border-radius:5px;border:2px solid ' + (d.done ? 'var(--success)' : 'var(--border)') + ';background:' + (d.done ? 'var(--success)' : 'transparent') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;font-size:13px;';
          admHtml += '<div style="display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:7px;' + doneStyle + '">'  
            + '<div style="' + checkStyle + '">' + (d.done ? 'v' : '') + '</div>'
            + '<div style="flex:1;"><span style="font-size:12px;font-weight:600;color:var(--text2);">' + (d.label || '') + '</span> <span style="font-size:12px;color:var(--text3);">' + (d.datetime || '') + '</span></div>'
            + (d.done ? '<span style="font-size:11px;color:var(--success);font-weight:600;">Done</span>' : '')
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
    allVitals.sort(function(a, b) { var ka=(a.date||'')+(a.time||a.datetime||''); var kb=(b.date||'')+(b.time||b.datetime||''); return kb.localeCompare(ka); }).forEach(function(v) {
      var dateTimeStr = (v.date ? v.date + ' ' : '') + (v.time || v.datetime || '\u2014');
      admHtml += '<div style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;">'  
        + '<div style="font-size:10px;color:var(--text3);margin-bottom:6px;font-weight:600;">' + (v.nurse || v.by || '—') + ' — ' + dateTimeStr + '</div>'
        + '<div style="font-size:12px;">HR: ' + (v.hr || '—') + ' bpm | BP: ' + (v.bp || '—') + ' | Temp: ' + (v.temp || '—') + '°C | SpO2: ' + (v.spo2 || '—') + '%</div></div>';
    });
  } else { admHtml += '<div style="color:var(--text3);font-size:13px;padding:8px;">No vital signs recorded.</div>'; }
  admHtml += '</div>';
  
  if (!allEvals.length && !allTx.length && !allVitals.length) admHtml = '<div style="color:var(--text3);padding:8px;">No admission history.</div>';

  html = '<div class="tab-bar" style="margin-bottom:14px;">'
    + '<div class="tab active" onclick="switchDFT(this,\'dft-main\')">Patient File</div>'
    + '<div class="tab" onclick="switchDFT(this,\'dft-eval\')">Write Evaluation</div>'
    + '<div class="tab" onclick="switchDFT(this,\'dft-tx\')">Prescribe Treatment</div>'
    + '</div>'
    + '<div id="dft-main">'
    + '<div class="fs"><div class="fst">Patient Information</div>'
    + docRow('Name', '<b>' + p.name + '</b> <code style="font-size:11px;">' + p.id + '</code>')
    + docRow('DOB / Gender', p.dob + ' — ' + p.gender)
    + docRow('Blood Type', p.blood) + docRow('Allergies', p.allergies) + docRow('Conditions', p.conditions)
    + docRow('Department / Bed', 'Dept ' + p.dept + ' — Bed ' + (p.bedNum || '—'))
    + docRow('Admission Date', p.admitted)
    + '</div>'
    + '<div class="fs"><div class="fst">Admission History</div>' + admHtml + '</div>'
    + '</div>'

    + '<div id="dft-eval" style="display:none;">'
    + '<div class="fg"><div class="fgr"><label>Doctor Name *</label><input id="dev-by" placeholder="Enter your full name"/></div>'
    + '<div class="fgr"><label>Patient State</label><select id="dev-state"><option>Stable</option><option>Improving</option><option>Deteriorating</option><option>Critical</option></select></div>'
    + '<div class="fgr full"><label>Observations *</label><textarea id="dev-obs" style="min-height:120px;" placeholder="Clinical observations…"></textarea></div></div>'
    + '<div class="fa"><button type="button" class="btn btn-p sm" onclick="saveDocEval(\'' + id + '\')">Save Evaluation</button></div></div>'

    + '<div id="dft-tx" style="display:none;">'
    + '<div class="fg"><div class="fgr"><label>Doctor Name *</label><input id="dtx-by" placeholder="Enter your full name"/></div>'
    + '<div class="fgr"><label>Medication *</label><input id="dtx-med" placeholder="e.g. Amoxicillin"/></div>'
    + '<div class="fgr"><label>Dosage *</label><input id="dtx-dose" placeholder="e.g. 500 mg"/></div>'
    + '<div class="fgr"><label>Frequency *</label><select id="dtx-freq"><option value="once_daily">Once daily (every 24h)</option><option value="twice_daily">Twice daily (every 12h)</option><option value="three_daily">Three times daily (every 8h)</option><option value="four_daily">Four times daily (every 6h)</option><option value="every_8h">Every 8 hours</option><option value="every_6h">Every 6 hours</option><option value="every_4h">Every 4 hours</option><option value="once_only">Once only (single dose)</option></select></div>'
    + '<div class="fgr"><label>First Dose Time</label><input type="time" id="dtx-start" value="08:00"/></div>'
    + '<div class="fgr"><label>Duration (days) *</label><input type="number" id="dtx-dur" placeholder="e.g. 3" min="1" max="30"/></div>'
    + '</div><div class="fa"><button type="button" class="btn btn-p sm" onclick="saveDocTx(\'' + id + '\')">Save Prescription</button></div></div>';

  document.getElementById('doc-file-mo-title').textContent = 'Medical File';
  document.getElementById('doc-file-mo-body').innerHTML = html;
  openMo('doc-file-mo');
}

function goToDoc(pageId, el) {
  document.querySelectorAll('.pg').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById(pageId);
  if (pg) pg.classList.add('active');

  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');

  if (pageId === 'd-dash') refreshDocDash();
  if (pageId === 'd-appts') renderDocAppts();
  if (pageId === 'd-patients') renderDocPts();
}

function switchDFT(el, show) {
  var body = document.getElementById('doc-file-mo-body');
  body.querySelectorAll('.tab-bar .tab').forEach(function(t) { t.classList.remove('active'); });
  if (el) el.classList.add('active');
  body.querySelectorAll('[id^="dft-"]').forEach(function(d) { d.style.display = 'none'; });
  var target = document.getElementById(show);
  if (target) target.style.display = 'block';
}

async function saveDocEval(id) {
  var p = patients.find(function(x) { return x.id === id; });
  if (!p) return;
  
  var byVal = document.getElementById('dev-by').value.trim();
  var stateVal = document.getElementById('dev-state').value;
  var obsVal = document.getElementById('dev-obs').value.trim();
  
  if (!byVal || !obsVal) {
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
    await createEvaluation({
      eval_type: 'Clinical',
      patient_state: stateVal,
      observations: obsVal,
      id_patient: p.backendId,
      id_doctor: curUser.id
    });

    showToast('Evaluation saved.', 'ok');
    document.getElementById('dev-by').value = '';
    document.getElementById('dev-state').value = 'Stable';
    document.getElementById('dev-obs').value = '';
    await loadPatientHistory(id);
    await openDocPatientFile(id);
  } catch (error) {
    console.error('Save evaluation failed:', error);
    showToast(error.data?.message || error.message || 'Failed to save evaluation.', 'err');
  }
}

async function saveDocTx(id) {
  var p = patients.find(function(x) { return x.id === id; });
  if (!p) return;
  
  var byVal = document.getElementById('dtx-by').value.trim();
  var medVal = document.getElementById('dtx-med').value.trim();
  var doseVal = document.getElementById('dtx-dose').value.trim();
  var freqVal = document.getElementById('dtx-freq').value;
  var startVal = document.getElementById('dtx-start').value;
  var durVal = parseInt(document.getElementById('dtx-dur').value, 10);
  
  if (!byVal || !medVal || !doseVal || !durVal) {
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
    await createPrescription({
      medication: medVal,
      dosage: doseVal,
      frequency: freqVal,
      duration_days: durVal,
      first_dose_time: startVal,
      id_patient: p.backendId,
      id_doctor: curUser.id
    });

    showToast('Prescription saved.', 'ok');
    document.getElementById('dtx-by').value = '';
    document.getElementById('dtx-med').value = '';
    document.getElementById('dtx-dose').value = '';
    document.getElementById('dtx-freq').value = 'once_daily';
    document.getElementById('dtx-start').value = '08:00';
    document.getElementById('dtx-dur').value = '';
    await loadPatientHistory(id);
    await openDocPatientFile(id);
  } catch (error) {
    console.error('Save prescription failed:', error);
    showToast(error.data?.message || error.message || 'Failed to save prescription.', 'err');
  }
}
