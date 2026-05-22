// ══════════════════════════════════════
// ADMIN FUNCTIONS
// ══════════════════════════════════════

function renderAdminStats() {
  document.getElementById('a-n-doc').textContent = staff.filter(s => s.role === 'doctor').length;
  document.getElementById('a-n-nur').textContent = staff.filter(s => s.role === 'nurse').length;
  document.getElementById('a-n-sec').textContent = staff.filter(s => s.role === 'secretary').length;
  document.getElementById('a-n-pat').textContent = patients.length;
  document.getElementById('a-n-adm').textContent = patients.filter(p => p.status === 'Admitted').length;

  var html = '';
  for (var dk in DEPTS) {
    var total = DEPTS[dk].beds;
    var occupied = patients.filter(function(p) { return p.dept === dk && p.status === 'Admitted'; }).length;
    html += '<div class="row"><div class="row-d">Dept ' + dk + ' — ' + DEPTS[dk].dept + '</div><div class="row-i"><div class="row-t">' + occupied + '/' + total + ' beds occupied</div></div></div>';
  }
  document.getElementById('a-wing-stats').innerHTML = html;
}

function renderAdminStaff(filter = '') {
  const q = (filter || '').toLowerCase();
  const tb = document.getElementById('a-staff-body');
  const list = staff.filter(s => !q || s.name.toLowerCase().includes(q) || s.user.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) || (s.dept || '').toLowerCase().includes(q));

  if (!list.length) {
    tb.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:24px;">No staff found.</td></tr>';
    return;
  }

  tb.innerHTML = list.map(s => `
    <tr>
      <td><code style="font-size:11px;color:var(--text3);">${s.id}</code></td>
      <td><b>${s.name}</b></td>
      <td>${s.user}</td>
      <td>${s.role}</td>
      <td>${s.phone || '—'}</td>
      <td>${s.specialty || '—'} / ${s.dept || '—'}</td>
      <td style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-p sm" onclick="editStaff('${s.id}')">Edit</button><button class="btn btn-d sm" onclick="deleteStaff('${s.id}')">Delete</button></td>
    </tr>
  `).join('');
}

function renderStaff(filter = '') {
  renderAdminStaff(filter);
}

function openCreateStaffModal() {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <div class="modal-title">Create Staff Account</div>
        <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
      </div>
      <form onsubmit="createStaff(event)" novalidate>
        <div class="fgr"><label>Name</label><input type="text" id="new-name" required></div>
        <div class="fgr"><label>Role</label><select id="new-role" required>
          <option value="doctor">Doctor</option>
          <option value="nurse">Nurse</option>
          <option value="secretary">Secretary</option>
          <option value="admin">Admin</option>
        </select></div>
        <div class="fgr"><label>Department</label><select id="new-wing">
          <option value="">—</option>
          ${Object.keys(DEPTS).map(dk => `<option value="${dk}">Dept ${dk} — ${DEPTS[dk].name}</option>`).join('')}
        </select></div>
        <div class="fgr"><label>Username</label><input type="text" id="new-user" required></div>
        <div class="fgr"><label>Phone</label><input type="tel" id="new-phone"></div>
        <div class="fgr"><label>Password</label><input type="password" id="new-pass" required></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-s" onclick="this.closest('.modal').remove()">Cancel</button>
          <button type="submit" class="btn btn-p">Create</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
}

async function createStaff(e) {
  e.preventDefault();
  const name = document.getElementById('new-name').value.trim();
  const role = document.getElementById('new-role').value;
  const wing = document.getElementById('new-wing').value;
  const user = document.getElementById('new-user').value.trim();
  const phone = document.getElementById('new-phone').value.trim();
  const pass = document.getElementById('new-pass').value.trim();

  if (!name || !role || !user || !pass) {
    showToast('Please fill all required fields.', 'err');
    return;
  }

  if (staff.some(s => s.user === user)) {
    showToast('Username already exists.', 'err');
    return;
  }

  const payload = {
    name,
    username: user,
    password: pass,
    phoneNbr: phone || null,
    role
  };

  if (role === 'doctor' || role === 'nurse') {
    const id_department = wingToDeptId(wing);
    if (!id_department) {
      showToast('Please select a department for doctor or nurse.', 'err');
      return;
    }
    payload.id_department = id_department;
    if (role === 'doctor') {
      payload.specialization = DEPTS[wing] ? DEPTS[wing].specialty : null;
    }
  }

  try {
    await createStaffMember(payload);
    showToast('Staff account created.', 'ok');
    e.target.closest('.modal').remove();
    await loadBackendData();
    renderAdminStaff();
    renderAdminStats();
  } catch (error) {
    console.error('Create staff failed:', error);
    showToast(error.data?.message || error.message || 'Failed to create staff account.', 'err');
  }
}

async function deleteStaff(id) {
  if (!confirm('Delete this staff account?')) return;
  const s = staff.find(x => x.id === id);
  if (!s || !s.backendId) {
    showToast('Staff member not found.', 'err');
    return;
  }

  try {
    await deleteStaffMember(s.role, s.backendId);
    showToast('Staff account deleted.', 'ok');
    await loadBackendData();
    renderAdminStaff();
    renderAdminStats();
  } catch (error) {
    console.error('Delete staff failed:', error);
    showToast(error.data?.message || error.message || 'Failed to delete staff account.', 'err');
  }
}

function editStaff(id) {
  const s = staff.find(x => x.id === id);
  if (!s) return;

  // Open modal for editing
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <div class="modal-title">Edit Account</div>
        <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
      </div>
      <form onsubmit="updateStaff(event,'${id}')" novalidate>
        <div class="fgr"><label>Phone Number</label><input type="tel" id="edit-phone" value="${s.phone || ''}" placeholder="e.g. 0551 100 001" required></div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);padding-top:10px;border-top:1px solid var(--border);">Change Password (leave blank to keep current)</div>
        <div class="fgr"><label>New Password</label><input type="password" id="edit-pass" placeholder="Min. 6 characters"></div>
        <div class="fgr"><label>Confirm Password</label><input type="password" id="edit-pass2" placeholder="Repeat new password"></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-s" onclick="this.closest('.modal').remove()">Cancel</button>
          <button type="submit" class="btn btn-p">Update</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
}

async function updateStaff(e, id) {
  e.preventDefault();
  const s = staff.find(x => x.id === id);
  if (!s || !s.backendId) return;
  const phone = document.getElementById('edit-phone').value.trim();
  const pass = document.getElementById('edit-pass').value;
  const pass2 = document.getElementById('edit-pass2').value;

  if (!phone) {
    showToast('Phone number is required.', 'err');
    return;
  }
  if (pass || pass2) {
    if (pass.length < 6) {
      showToast('New password must be at least 6 characters.', 'err');
      return;
    }
    if (pass !== pass2) {
      showToast('Passwords do not match.', 'err');
      return;
    }
  }

  try {
    await updateStaffMember(s.role, s.backendId, {
      phoneNbr: phone,
      password: pass || ''
    });
    showToast('Staff member updated.', 'ok');
    e.target.closest('.modal').remove();
    await loadBackendData();
    renderAdminStaff();
    renderAdminStats();
  } catch (error) {
    console.error('Update staff failed:', error);
    showToast(error.data?.message || error.message || 'Failed to update staff account.', 'err');
  }
}

function goToAdmin(pageId, el) {
  document.querySelectorAll('.pg').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById(pageId);
  if (pg) pg.classList.add('active');

  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');

  if (pageId === 'a-stats') renderAdminStats();
  if (pageId === 'a-staff') renderAdminStaff();
}
