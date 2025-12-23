'use strict';
/* security.js
   Authentication + User Profile + Biometric (WebAuthn)
   Depends on window.MT.db
*/

(function () {
  const db = window.MT.db;

  /* ================= AUTH DOM ================= */
  const authScreen = document.getElementById('authScreen');
  const authForm = document.getElementById('authForm');
  const authNameRow = document.getElementById('authNameRow');
  const authNameInput = document.getElementById('authName');
  const authSecurityHintInput = document.getElementById('authSecurityHint');
  const authPasswordInput = document.getElementById('authPassword');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const forgotBtn = document.getElementById('forgotBtn');
  const authHint = document.getElementById('authHint');

  /* ================= HELPERS ================= */

  async function isBiometricSupported() {
    return (
      window.PublicKeyCredential &&
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    );
  }

  async function tryBiometricUnlock(user) {
    try {
      const credId = new Uint8Array(user.biometricCredentialId);
      await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [{ type: 'public-key', id: credId }],
          userVerification: 'required'
        }
      });
      enterApp();
      return true;
    } catch {
      return false;
    }
  }

  async function registerBiometric() {
    const status = document.getElementById('biometricStatus');
    const user = db.loadUser();
    if (!user) return;

    if (!(await isBiometricSupported())) {
      status.textContent = 'Biometric not supported on this device';
      return;
    }

    try {
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: 'LUDARP Money Tracker' },
          user: {
            id: new TextEncoder().encode(user.name),
            name: user.name,
            displayName: user.name
          },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required'
          },
          attestation: 'none'
        }
      });

      user.biometricCredentialId = Array.from(new Uint8Array(cred.rawId));
      user.biometricEnabled = true;
      db.saveUser(user);

      status.textContent = 'Fingerprint enabled successfully';
    } catch {
      status.textContent = 'Biometric setup cancelled or failed';
    }
  }

  /* ================= AUTH SETUP ================= */

  function setupAuth() {
    const user = db.loadUser();

    if (!user) {
      authNameRow.style.display = 'block';
      authSubmitBtn.textContent = 'Create & Enter';
    } else {
      authNameRow.style.display = 'none';
      authSubmitBtn.textContent = 'Unlock';
      authHint.textContent = user.securityHint ? `Hint: ${user.securityHint}` : '';
    }

    // Auto biometric unlock
    if (user && user.biometricEnabled) {
      tryBiometricUnlock(user);
    }

    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const pw = authPasswordInput.value.trim();
      if (!pw) {
        alert('Password required');
        return;
      }

      const existing = db.loadUser();

      // Create account
      if (!existing) {
        db.saveUser({
          name: authNameInput.value.trim() || 'User',
          password: pw,
          securityHint: authSecurityHintInput?.value.trim() || '',
          biometricEnabled: false
        });
        enterApp();
        return;
      }

      // Password login
      if (pw !== existing.password) {
        alert('Incorrect password');
        return;
      }

      enterApp();
    });

    forgotBtn?.addEventListener('click', () => {
      const u = db.loadUser();
      if (!u) return alert('No account exists');

      const name = prompt('Enter your user name:');
      if (!name || name !== u.name) return alert('Name mismatch');

      if (u.securityHint) {
        const confirmHint = prompt(`Security hint: ${u.securityHint}`);
        if (!confirmHint) return;
      }

      const newPw = prompt('Enter new password:');
      if (!newPw) return;

      u.password = newPw;
      db.saveUser(u);
      alert('Password reset successfully');
    });
  }

  function enterApp() {
    authScreen.style.display = 'none';
    document.getElementById('appRoot').style.display = 'block';
    window.dispatchEvent(new Event('mt:auth-entered'));
  }

  /* ================= USER PAGE ================= */

  window.addEventListener('mt:auth-entered', () => {

    const nameField = document.getElementById('userNameField');
    const hintField = document.getElementById('securityHint');
    const oldPw = document.getElementById('oldPassword');
    const newPw = document.getElementById('newPassword');
    const changeBtn = document.getElementById('changePasswordBtn');
    const status = document.getElementById('passwordStatus');
    const enableBioBtn = document.getElementById('enableBiometricBtn');

    function loadUserUI() {
      const u = db.loadUser();
      if (!u) return;
      nameField.value = u.name || '';
      hintField.value = u.securityHint || '';
      oldPw.value = '';
      newPw.value = '';
      status.textContent = '';
    }

    function saveProfile() {
      const u = db.loadUser();
      if (!u) return;
      u.name = nameField.value.trim() || u.name;
      u.securityHint = hintField.value.trim();
      db.saveUser(u);
    }

    changeBtn.addEventListener('click', () => {
      const u = db.loadUser();
      if (!u) return;

      if (!oldPw.value || !newPw.value) {
        status.textContent = 'Fill both fields';
        return;
      }

      if (oldPw.value !== u.password) {
        status.textContent = 'Current password incorrect';
        return;
      }

      u.password = newPw.value;
      db.saveUser(u);
      oldPw.value = '';
      newPw.value = '';
      status.textContent = 'Password updated successfully';
    });

    enableBioBtn?.addEventListener('click', registerBiometric);
    nameField.addEventListener('blur', saveProfile);
    hintField.addEventListener('blur', saveProfile);

    window.addEventListener('mt:view-changed', (e) => {
      if (e.detail?.viewName === 'user') loadUserUI();
    });

    loadUserUI();
  });

  /* ================= INIT ================= */

  window.MT = window.MT || {};
  window.MT.security = { setupAuth, enterApp };

  setupAuth();

})();
