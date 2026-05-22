// ══════════════════════════════════════
// LOGIN & AUTHENTICATION
// ══════════════════════════════════════

let selectedRole = '';

function selRole(role) {
  // highlight selected role card
  document.querySelectorAll('.rc').forEach(c => c.classList.remove('sel'));
  document.getElementById('rc-' + role)?.classList.add('sel');
  selectedRole = role;
  
  const roleNames = {
    secretary: 'Medical Secretary',
    doctor: 'Doctor',
    nurse: 'Nurse',
    admin: 'Administrator'
  };
  
  document.getElementById('sel-name').textContent = roleNames[role] || role;
  document.getElementById('sel-tag').classList.add('vis');
}

function togglePw() {
  const f = document.getElementById('lp');
  f.type = (f.type === 'password') ? 'text' : 'password';
}

async function doLogin(e) {
  e.preventDefault();
  const u = document.getElementById('lu').value.trim().toLowerCase();
  const p = document.getElementById('lp').value;
  const err = document.getElementById('lerr');
  err.style.display = 'none';

  if (!selectedRole) {
    showErr(err, 'Please select a role before signing in.');
    return;
  }

  if (!u || !p) {
    showErr(err, 'Please enter both username and password.');
    return;
  }

  try {
    const response = await loginUser(u, p, selectedRole);
    const user = response.user;

    if (!user) {
      showErr(err, 'Login failed. Please try again.');
      return;
    }

    // Normalize backend username field for frontend compatibility.
    if (!user.user && user.username) {
      user.user = user.username;
    }

    curUser = user;
    sessionStorage.setItem('curUser', JSON.stringify(curUser));

    if (user.role === 'admin') {
      window.location.href = 'admin/statistics.html';
    } else if (user.role === 'secretary') {
      window.location.href = 'secretary/dashboard.html';
    } else if (user.role === 'doctor') {
      window.location.href = 'doctor/dashboard.html';
    } else if (user.role === 'nurse') {
      window.location.href = 'nurse/dashboard.html';
    } else {
      window.location.href = 'index.html';
    }
  } catch (error) {
    const message = error.data?.message || error.message || 'Login failed. Please try again.';
    showErr(err, message);
  }
}

function showErr(el, msg) {
  el.textContent = msg;
  el.style.display = 'block';
}

function doLogout() {
  curUser = null;
  selectedRole = '';
  sessionStorage.removeItem('curUser');
  
  // Only clear login form elements if they exist (on login page)
  const lu = document.getElementById('lu');
  const lp = document.getElementById('lp');
  const lerr = document.getElementById('lerr');
  const selTag = document.getElementById('sel-tag');
  const selName = document.getElementById('sel-name');
  
  if (lu) lu.value = '';
  if (lp) lp.value = '';
  if (lerr) lerr.style.display = 'none';
  document.querySelectorAll('.rc').forEach(c => c.classList.remove('sel'));
  if (selTag) selTag.classList.remove('vis');
  if (selName) selName.textContent = 'Role not selected';
  
  window.location.href = '../index.html';
}

// Restore user session
function restoreSession() {
  const user = sessionStorage.getItem('curUser');
  if (!user) {
    window.location.href = '../index.html';
    return false;
  }
  curUser = JSON.parse(user);
  return true;
}
