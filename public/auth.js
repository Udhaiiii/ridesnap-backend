// auth.js — include in every protected page
// Usage: <script src="/auth.js"></script>
// Then call: requireAuth('photographer') or requireAuth(['counter','admin'])

const RS_API = (window.location.hostname==='localhost'||window.location.hostname==='127.0.0.1')
  ? 'http://localhost:5000/api' : window.location.origin+'/api';

// Get current user from localStorage
function rsGetUser() {
  try { return JSON.parse(localStorage.getItem('rs_user')); } catch(e) { return null; }
}

function rsGetToken() { return localStorage.getItem('rs_token'); }
function rsGetRole()  { return localStorage.getItem('rs_role'); }
function rsGetName()  { return localStorage.getItem('rs_name'); }

// Require auth — call at top of each page
// allowedRoles: string or array e.g. 'admin' or ['admin','counter']
async function requireAuth(allowedRoles) {
  const token = rsGetToken();
  const role  = rsGetRole();

  if (!token || !role) {
    window.location.href = '/login.html';
    return null;
  }

  // Check role permission
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  // Admin always has access everywhere
  if (!allowed.includes(role) && role !== 'admin') {
    window.location.href = '/login.html?reason=unauthorized';
    return null;
  }

  // Verify token with server
  try {
    const res  = await fetch(`${RS_API}/auth/verify`, {
      headers: { 'x-auth-token': token }
    });
    const data = await res.json();
    if (!data.success) {
      rsLogout();
      return null;
    }
    // Update stored user
    localStorage.setItem('rs_user', JSON.stringify(data.user));
    return data.user;
  } catch(e) {
    // Server offline — allow access with cached token (offline mode)
    return rsGetUser();
  }
}

// Logout
function rsLogout() {
  const token = rsGetToken();
  if (token) {
    fetch(`${RS_API}/auth/logout`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
      body:    JSON.stringify({ token }),
    }).catch(() => {});
  }
  localStorage.removeItem('rs_token');
  localStorage.removeItem('rs_role');
  localStorage.removeItem('rs_name');
  localStorage.removeItem('rs_user');
  window.location.href = '/login.html';
}

// Inject user info bar into any page
// Call after requireAuth: injectUserBar('Photo Desk')
function injectUserBar(pageName) {
  const name = rsGetName() || 'Staff';
  const role = rsGetRole() || '';
  const roleLabels = {
    admin: '👑 Admin', photographer: '📷 Photographer',
    counter: '🖥️ Counter Staff', print: '🖨️ Print Staff'
  };
  const bar = document.createElement('div');
  bar.id = 'rs-user-bar';
  bar.style.cssText = `
    position:fixed; bottom:0; left:0; right:0; z-index:999;
    background:#1a1a1a; border-top:1px solid #2a2a2a;
    padding:8px 20px; display:flex; align-items:center;
    justify-content:space-between; font-family:'DM Mono',monospace;
    font-size:11px; color:#888;
  `;
  bar.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px">
      <span style="color:#fbbf24">📸 RideSnap</span>
      <span>·</span>
      <span>${pageName || ''}</span>
    </div>
    <div style="display:flex;align-items:center;gap:16px">
      <span style="color:#555">${roleLabels[role]||role}</span>
      <span style="color:#444">|</span>
      <span style="color:#aaa">${name}</span>
      <button onclick="rsLogout()" style="
        background:#2a2a2a;border:1px solid #444;color:#888;
        padding:4px 12px;border-radius:6px;cursor:pointer;
        font-family:'DM Mono',monospace;font-size:10px;
        transition:all .15s;
      " onmouseover="this.style.borderColor='#fb7185';this.style.color='#fb7185'"
         onmouseout="this.style.borderColor='#444';this.style.color='#888'">
        Logout
      </button>
    </div>
  `;
  document.body.appendChild(bar);
  // Add bottom padding to body so content isn't hidden behind bar
  document.body.style.paddingBottom = '38px';
}