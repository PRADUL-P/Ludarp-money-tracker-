'use strict';
/* security.js
   Authentication / user setup / password reset
   Depends on window.MT.db being available
*/

(function(){
  const db = window.MT.db;

  // DOM refs used by auth
  const authScreen = document.getElementById('authScreen');
  const authForm = document.getElementById('authForm');
  const authNameRow = document.getElementById('authNameRow');
  const authNameInput = document.getElementById('authName');
  const authSecurityHintInput = document.getElementById('authSecurityHint');
  const authPasswordInput = document.getElementById('authPassword');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const forgotBtn = document.getElementById('forgotBtn');
  const authHint = document.getElementById('authHint');

  function setupAuth(){
    const user = db.loadUser();
    if(!user){
      authNameRow.style.display='block';
      document.getElementById('authTitle').textContent='Create account';
      document.getElementById('authSubtitle').textContent='Set a password to secure your data on this device.';
      authSubmitBtn.textContent='Create & Enter';
    } else {
      authNameRow.style.display='none';
      document.getElementById('authTitle').textContent=`Welcome back, ${user.name||'User'}`;
      document.getElementById('authSubtitle').textContent='Enter your password to continue.';
      authSubmitBtn.textContent='Unlock';
      authHint.textContent = user.securityHint ? `Hint: ${user.securityHint}` : '';
    }

    if(authForm) authForm.addEventListener('submit', e=>{
      e.preventDefault();
      const pw = authPasswordInput.value.trim();
      if(!pw){ alert('Password required'); return; }
      const existing = db.loadUser();
      if(!existing){
        const name = authNameInput.value.trim() || 'User';
        const hint = authSecurityHintInput ? authSecurityHintInput.value.trim() : '';
        const u = { name, password: pw, biometricPreferred:false, securityHint: hint };
        db.saveUser(u);
        enterApp();
      } else {
        if(pw !== existing.password){ alert('Incorrect password'); return; }
        enterApp();
      }
    });

    if(forgotBtn) forgotBtn.addEventListener('click', ()=> {
      const u = db.loadUser();
      if(!u){ alert('No account exists. Create one first.'); return; }
      const name = prompt('Enter your user name to reset password:');
      if(!name) return;
      if(name.trim() !== u.name){ alert('Name does not match. Cannot reset.'); return; }
      if(u.securityHint){
        const hintAns = prompt(`Security hint: ${u.securityHint}\nType anything to confirm:`);
        if(!hintAns){ alert('Reset cancelled'); return; }
      }
      const newPw = prompt('Enter a new password (will replace old):');
      if(!newPw) return;
      u.password = newPw;
      db.saveUser(u);
      alert('Password reset locally. Please login with new password.');
    });
  }

  function enterApp(){
    if(authScreen) authScreen.style.display='none';
    const appRoot = document.getElementById('appRoot');
    if(appRoot) appRoot.style.display='block';
    // after auth, initialize app modules that rely on DOM/mounted state
    // We'll fire a small event to signal that init can continue
    window.dispatchEvent(new Event('mt:auth-entered'));
  }

  // export for other modules (optional)
  window.MT = window.MT || {};
  window.MT.security = { setupAuth, enterApp };

  // run immediately to show auth UI
  setupAuth();

})();



/* ===============================
   USER PAGE PROFILE + PASSWORD
   (attach AFTER login)
================================ */

window.addEventListener('mt:auth-entered', () => {

  const nameField   = document.getElementById('userNameField');
  const hintField   = document.getElementById('securityHint');
  const oldPwInput  = document.getElementById('oldPassword');
  const newPwInput  = document.getElementById('newPassword');
  const changeBtn   = document.getElementById('changePasswordBtn');
  const statusEl    = document.getElementById('passwordStatus');

  if (!nameField || !changeBtn) {
    console.warn('[User page] fields not found');
    return;
  }

  /* ---------- LOAD USER INTO UI ---------- */
  function loadUserUI() {
    const user = window.MT.db.loadUser();
    if (!user) return;

    nameField.value = user.name || '';
    hintField.value = user.securityHint || '';
    statusEl.textContent = '';

    oldPwInput.value = '';
    newPwInput.value = '';
  }

  /* ---------- SAVE PROFILE (NAME + HINT) ---------- */
  function saveProfile() {
    const user = window.MT.db.loadUser();
    if (!user) return;

    user.name = nameField.value.trim() || user.name;
    user.securityHint = hintField.value.trim();

    window.MT.db.saveUser(user);
  }

  /* ---------- CHANGE PASSWORD ---------- */
  changeBtn.addEventListener('click', () => {
    const user = window.MT.db.loadUser();
    if (!user) return;

    const oldPw = oldPwInput.value.trim();
    const newPw = newPwInput.value.trim();

    if (!oldPw || !newPw) {
      statusEl.textContent = 'Please fill both password fields';
      return;
    }

    if (oldPw !== user.password) {
      statusEl.textContent = 'Current password incorrect';
      return;
    }

    user.password = newPw;
    window.MT.db.saveUser(user);

    oldPwInput.value = '';
    newPwInput.value = '';
    statusEl.textContent = 'Password updated successfully';
  });

  /* ---------- AUTO-SAVE NAME & HINT ---------- */
  nameField.addEventListener('blur', saveProfile);
  hintField.addEventListener('blur', saveProfile);

  /* ---------- REFRESH WHEN USER PAGE OPENS ---------- */
  window.addEventListener('mt:view-changed', (e) => {
    if (e.detail?.viewName === 'user') {
      loadUserUI();
    }
  });

  // initial load (first time user opens page)
  loadUserUI();
});
