// auth-gate.js
// Sistem gate konten Academy Eji
// Include di semua halaman SETELAH auth.js
// Menangani: popup login/register, gate konten berdasarkan role, popup upgrade VIP

(async () => {

  // ══════════════════════════════════════════════
  // 1. CEK SESI — tampilkan modal jika belum login
  // ══════════════════════════════════════════════

  let currentUser = null;

  // Coba ambil dari cache lokal dulu (cepat)
  const cached = Auth.getUser();
  if (cached) currentUser = cached;

  // Inject styles modal
  injectStyles();

  // Inject modal HTML ke body
  injectModal();

  // Jika belum login, tampilkan modal
  if (!currentUser) {
    showAuthModal();
  } else {
    // Verifikasi ke server di background (tidak memblokir render)
    Auth.verify().then(user => {
      if (!user) {
        showAuthModal();
      } else {
        currentUser = user;
        updateUI(user);
        applyContentGate(user);
      }
    });
    updateUI(currentUser);
    applyContentGate(currentUser);
  }

  // ══════════════════════════════════════════════
  // 2. INJECT STYLES
  // ══════════════════════════════════════════════

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* ── AUTH MODAL ── */
      #auth-modal-overlay {
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        padding: 16px;
        opacity: 0; transition: opacity 0.3s;
      }
      #auth-modal-overlay.show { opacity: 1; }
      #auth-modal {
        background: var(--surface, #fff); border-radius: 20px;
        padding: 40px 36px; width: 100%; max-width: 420px;
        box-shadow: 0 25px 60px rgba(0,0,0,0.25);
        transform: translateY(20px) scale(0.97); transition: transform 0.3s;
        position: relative;
      }
      #auth-modal-overlay.show #auth-modal { transform: translateY(0) scale(1); }
      .auth-logo { text-align: center; margin-bottom: 24px; }
      .auth-logo-icon {
        width: 56px; height: 56px; border-radius: 16px;
        background: linear-gradient(135deg, #2563eb, #60a5fa);
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 28px; color: #fff; margin-bottom: 10px;
        box-shadow: 0 8px 20px rgba(37,99,235,0.3);
      }
      .auth-logo-name { font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 700; color: var(--ink, #0f172a); }
      .auth-logo-name span { color: #2563eb; }
      .auth-tab-row { display: flex; background: var(--surface2, #f8fafc); border-radius: 10px; padding: 4px; margin-bottom: 24px; gap: 4px; }
      .auth-tab {
        flex: 1; padding: 8px; text-align: center; border-radius: 8px; cursor: pointer;
        font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600;
        color: var(--ink3, #64748b); border: none; background: transparent; transition: all 0.2s;
      }
      .auth-tab.active { background: var(--surface, #fff); color: var(--primary, #2563eb); box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
      .auth-panel { display: none; }
      .auth-panel.active { display: block; }
      .auth-label { font-family: 'Sora', sans-serif; font-size: 12px; font-weight: 600; color: var(--ink3, #64748b); display: block; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
      .auth-title { font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 700; color: var(--ink, #0f172a); margin-bottom: 6px; }
      .auth-sub { font-family: 'Sora', sans-serif; font-size: 13px; color: var(--ink3, #64748b); margin-bottom: 20px; }
      .auth-input-wrap { position: relative; margin-bottom: 16px; }
      .auth-input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 18px; color: var(--ink4, #94a3b8); pointer-events: none; }
      .auth-input {
        width: 100%; padding: 12px 14px 12px 42px;
        font-family: 'Sora', sans-serif; font-size: 14px;
        border: 1.5px solid var(--border, #e2e8f0); border-radius: 10px;
        background: var(--surface2, #f8fafc); color: var(--ink, #0f172a);
        outline: none; transition: border-color 0.2s, box-shadow 0.2s;
      }
      .auth-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); background: var(--surface, #fff); }
      .auth-btn {
        width: 100%; padding: 13px;
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        color: #fff; border: none; border-radius: 10px;
        font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 600;
        cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;
      }
      .auth-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(37,99,235,0.3); }
      .auth-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
      .auth-error {
        font-family: 'Sora', sans-serif; font-size: 12px; color: #ef4444;
        background: #fef2f2; border: 1px solid #fecaca;
        padding: 10px 14px; border-radius: 8px; margin-bottom: 14px; display: none;
      }
      .auth-error.show { display: block; }
      .auth-hint { font-family: 'Sora', sans-serif; font-size: 12px; color: var(--ink4, #94a3b8); margin-top: 14px; text-align: center; line-height: 1.6; }

      /* ── POPUP VIP ── */
      #vip-popup-overlay {
        position: fixed; inset: 0; z-index: 9998;
        background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
        display: none; align-items: center; justify-content: center; padding: 16px;
      }
      #vip-popup-overlay.show { display: flex; }
      #vip-popup {
        background: var(--surface, #fff); border-radius: 20px;
        padding: 36px 32px; width: 100%; max-width: 380px; text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        animation: popIn 0.3s ease;
      }
      @keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      .vip-popup-crown { font-size: 48px; margin-bottom: 8px; }
      .vip-popup-title { font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 700; color: var(--ink, #0f172a); margin-bottom: 8px; }
      .vip-popup-price { font-family: 'Sora', sans-serif; font-size: 28px; font-weight: 700; color: #d97706; margin: 8px 0; }
      .vip-popup-price small { font-size: 14px; font-weight: 400; color: var(--ink3, #64748b); }
      .vip-popup-sub { font-family: 'Sora', sans-serif; font-size: 13px; color: var(--ink3, #64748b); margin-bottom: 20px; line-height: 1.5; }
      .vip-popup-btns { display: flex; flex-direction: column; gap: 8px; }
      .vip-btn-upgrade {
        padding: 12px; border-radius: 10px;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: #fff; font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 600;
        border: none; cursor: pointer; text-decoration: none; display: block;
        transition: all 0.2s;
      }
      .vip-btn-upgrade:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(245,158,11,0.35); }
      .vip-btn-back {
        padding: 11px; border-radius: 10px;
        background: var(--surface2, #f8fafc); color: var(--ink2, #334155);
        font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600;
        border: 1.5px solid var(--border, #e2e8f0); cursor: pointer;
        transition: all 0.2s;
      }
      .vip-btn-back:hover { background: var(--border, #e2e8f0); }

      /* ── PREMIUM BADGE & BLUR ── */
      .premium-badge {
        display: inline-flex; align-items: center; gap: 4px;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: #fff; font-size: 10px; font-weight: 700;
        padding: 2px 8px; border-radius: 20px;
        text-transform: uppercase; letter-spacing: 0.5px;
        vertical-align: middle;
      }
      .content-locked .desc-text,
      .content-locked p,
      .content-locked .artikel-desc,
      .content-locked .card-desc {
        filter: blur(4px); user-select: none; pointer-events: none;
        position: relative;
      }
      .content-locked { position: relative; }
      .btn-premium-locked {
        background: linear-gradient(135deg, #f59e0b, #d97706) !important;
        color: #fff !important; cursor: pointer !important;
        pointer-events: all !important; border-color: transparent !important;
      }
      .btn-premium-locked:disabled { opacity: 1 !important; }

      /* ── USER PILL DI TOPBAR ── */
      #user-pill {
        display: flex; align-items: center; gap: 8px;
        background: var(--surface2, #f8fafc); border: 1px solid var(--border, #e2e8f0);
        border-radius: 20px; padding: 5px 12px 5px 6px; cursor: pointer;
        transition: all 0.2s; font-family: 'Sora', sans-serif;
      }
      #user-pill:hover { background: var(--border, #e2e8f0); }
      #user-pill .pill-avatar {
        width: 26px; height: 26px; border-radius: 50%;
        background: linear-gradient(135deg, #2563eb, #60a5fa);
        display: flex; align-items: center; justify-content: center;
        color: #fff; font-size: 13px;
      }
      #user-pill .pill-name { font-size: 12px; font-weight: 600; color: var(--ink, #0f172a); max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      #user-pill .pill-role { font-size: 10px; }
      .vip-crown { color: #f59e0b; font-size: 12px; }
    `;
    document.head.appendChild(style);
  }

  // ══════════════════════════════════════════════
  // 3. INJECT MODAL HTML
  // ══════════════════════════════════════════════

  function injectModal() {
    const overlay = document.createElement('div');
    overlay.id = 'auth-modal-overlay';
    overlay.innerHTML = `
      <div id="auth-modal">
        <div class="auth-logo">
          <div class="auth-logo-icon"><i class='bx bxs-graduation'></i></div>
          <div class="auth-logo-name">Academy<span>Eji.</span></div>
        </div>
        <div class="auth-tab-row">
          <button class="auth-tab active" data-tab="login">Masuk</button>
          <button class="auth-tab" data-tab="register">Daftar</button>
        </div>

        <!-- LOGIN -->
        <div class="auth-panel active" id="auth-panel-login">
          <div class="auth-title">Selamat Datang 👋</div>
          <div class="auth-sub">Masukkan nama kamu untuk melanjutkan.</div>
          <div class="auth-error" id="login-error"></div>
          <div class="auth-input-wrap">
            <i class='bx bx-user auth-input-icon'></i>
            <input class="auth-input" id="login-name" type="text" placeholder="Nama kamu..." autocomplete="off" maxlength="40" />
          </div>
          <button class="auth-btn" id="login-btn"><i class='bx bx-log-in'></i> Masuk</button>
          <div class="auth-hint">Belum punya akun? Klik tab <strong>Daftar</strong> di atas.</div>
        </div>

        <!-- REGISTER -->
        <div class="auth-panel" id="auth-panel-register">
          <div class="auth-title">Buat Akun Baru ✨</div>
          <div class="auth-sub">Masukkan nama untuk mendaftar sebagai Tamu.</div>
          <div class="auth-error" id="register-error"></div>
          <div class="auth-input-wrap">
            <i class='bx bx-id-card auth-input-icon'></i>
            <input class="auth-input" id="register-name" type="text" placeholder="Nama lengkap kamu..." autocomplete="off" maxlength="40" />
          </div>
          <button class="auth-btn" id="register-btn"><i class='bx bx-user-plus'></i> Daftar Sekarang</button>
          <div class="auth-hint">Sudah punya akun? Klik tab <strong>Masuk</strong> di atas.<br>Akun baru otomatis terdaftar sebagai <strong>Tamu</strong>.</div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // VIP Popup
    const vipOverlay = document.createElement('div');
    vipOverlay.id = 'vip-popup-overlay';
    vipOverlay.innerHTML = `
      <div id="vip-popup">
        <div class="vip-popup-crown">👑</div>
        <div class="vip-popup-title">Konten Premium!</div>
        <div class="vip-popup-price">Rp 5.000 <small>/ bulan</small></div>
        <div class="vip-popup-sub">Upgrade VIP yuk, murah banget!<br>Buka akses semua konten eksklusif.</div>
        <div class="vip-popup-btns">
          <a href="/premium/index.html" class="vip-btn-upgrade">👑 Upgrade VIP Sekarang</a>
          <button class="vip-btn-back" id="vip-popup-close">← Kembali ke Dashboard</button>
        </div>
      </div>
    `;
    document.body.appendChild(vipOverlay);

    // ── Event listeners modal
    setupModalEvents();
  }

  function showAuthModal() {
    const overlay = document.getElementById('auth-modal-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('show'));
  }

  function hideAuthModal() {
    const overlay = document.getElementById('auth-modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('show');
    setTimeout(() => { overlay.style.display = 'none'; }, 300);
  }

  function showVipPopup() {
    const overlay = document.getElementById('vip-popup-overlay');
    if (overlay) overlay.classList.add('show');
  }

  function hideVipPopup() {
    const overlay = document.getElementById('vip-popup-overlay');
    if (overlay) overlay.classList.remove('show');
  }

  window.showVipPopup = showVipPopup;

  function setupModalEvents() {
    // Tab switch
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`auth-panel-${tab.dataset.tab}`).classList.add('active');
      });
    });

    // Enter key
    ['login-name', 'register-name'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById(id.replace('name', 'btn')).click(); });
    });

    // Login
    document.getElementById('login-btn').addEventListener('click', async () => {
      const name = document.getElementById('login-name').value.trim();
      const errEl = document.getElementById('login-error');
      const btn = document.getElementById('login-btn');
      errEl.classList.remove('show');
      if (!name) { errEl.textContent = 'Nama tidak boleh kosong.'; errEl.classList.add('show'); return; }
      btn.disabled = true; btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Memproses...";
      const result = await Auth.login(name);
      if (result.ok) {
        currentUser = result.user;
        hideAuthModal();
        updateUI(result.user);
        applyContentGate(result.user);
      } else {
        errEl.textContent = result.error || 'Terjadi kesalahan.';
        errEl.classList.add('show');
        btn.disabled = false; btn.innerHTML = "<i class='bx bx-log-in'></i> Masuk";
      }
    });

    // Register
    document.getElementById('register-btn').addEventListener('click', async () => {
      const name = document.getElementById('register-name').value.trim();
      const errEl = document.getElementById('register-error');
      const btn = document.getElementById('register-btn');
      errEl.classList.remove('show');
      if (!name) { errEl.textContent = 'Nama tidak boleh kosong.'; errEl.classList.add('show'); return; }
      btn.disabled = true; btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Mendaftar...";
      const result = await Auth.register(name);
      if (result.ok) {
        currentUser = result.user;
        hideAuthModal();
        updateUI(result.user);
        applyContentGate(result.user);
      } else {
        errEl.textContent = result.error || 'Terjadi kesalahan.';
        errEl.classList.add('show');
        btn.disabled = false; btn.innerHTML = "<i class='bx bx-user-plus'></i> Daftar Sekarang";
      }
    });

    // VIP popup close
    document.getElementById('vip-popup-close').addEventListener('click', () => {
      hideVipPopup();
      window.location.href = '/index.html';
    });
  }

  // ══════════════════════════════════════════════
  // 4. UPDATE UI SETELAH LOGIN
  // ══════════════════════════════════════════════

  function updateUI(user) {
    // Update user info di sidebar jika ada
    const nameEl = document.getElementById('sidebar-username');
    const roleEl = document.getElementById('sidebar-role');
    if (nameEl) nameEl.textContent = user.username;
    if (roleEl) {
      if (user.role === 'vip') {
        roleEl.innerHTML = '<span class="vip-badge"><i class="bx bxs-crown"></i> VIP</span>';
      } else {
        roleEl.textContent = 'Tamu';
      }
    }

    // Inject user pill ke topbar jika belum ada
    const topbarRight = document.querySelector('.topbar-right');
    if (topbarRight && !document.getElementById('user-pill')) {
      const pill = document.createElement('div');
      pill.id = 'user-pill';
      pill.title = 'Klik untuk logout';
      pill.innerHTML = `
        <div class="pill-avatar"><i class='bx bxs-user'></i></div>
        <div>
          <div class="pill-name">${user.username}</div>
          <div class="pill-role">${user.role === 'vip' ? '<span class="vip-crown">👑</span> VIP' : 'Tamu'}</div>
        </div>
      `;
      pill.addEventListener('click', () => {
        if (confirm(`Logout dari akun "${user.username}"?`)) Auth.logout();
      });
      topbarRight.prepend(pill);
    }

    // Show/hide nav upgrade VIP
    const navUpgrade = document.getElementById('nav-upgrade-vip');
    if (navUpgrade) {
      navUpgrade.style.display = user.role === 'tamu' ? 'flex' : 'none';
    }

    // Tambah nav item Upgrade VIP di sidebar jika tamu & belum ada
    if (user.role === 'tamu') {
      const sidebarScroll = document.querySelector('.sidebar-scroll');
      if (sidebarScroll && !document.getElementById('nav-upgrade')) {
        const link = document.createElement('a');
        link.id = 'nav-upgrade';
        link.className = 'nav-item';
        link.href = '/premium/index.html';
        link.style.color = '#d97706';
        link.innerHTML = `<i class='bx bxs-crown nav-icon' style="color:#f59e0b;"></i> Upgrade VIP`;
        // Sisipkan sebelum Tentang Kami
        const tentang = sidebarScroll.querySelector('[href*="config"]');
        if (tentang) sidebarScroll.insertBefore(link, tentang);
        else sidebarScroll.appendChild(link);
      }
    }
  }

  // ══════════════════════════════════════════════
  // 5. GATE KONTEN BERDASARKAN ROLE & HALAMAN
  // ══════════════════════════════════════════════

  function applyContentGate(user) {
    const isVip = user.role === 'vip';
    const path = window.location.pathname;

    // ── A. Halaman yang diblokir total untuk Tamu ──
    const blockedPaths = ['/referensi/', '/ujicoba/instruksi.html'];
    const blockedUjicobaTypes = ['toefl', 'ukbi'];

    // Cek apakah halaman ini adalah referensi/ebook
    if (!isVip && path.includes('/referensi/')) {
      showVipPopup();
      return;
    }

    // Cek ujicoba TOEFL/UKBI
    if (!isVip && path.includes('/ujicoba/instruksi.html')) {
      const params = new URLSearchParams(window.location.search);
      const tes = params.get('tes');
      if (tes === 'toefl' || tes === 'ukbi') {
        showVipPopup();
        return;
      }
    }

    // ── B. Gate di index.html — exam card TOEFL & UKBI ──
    if (!isVip) {
      document.querySelectorAll('[href*="instruksi.html?tes=toefl"], [href*="instruksi.html?tes=ukbi"]').forEach(el => {
        el.addEventListener('click', e => {
          e.preventDefault();
          showVipPopup();
        });

        // Tambah badge premium
        const badge = document.createElement('span');
        badge.className = 'premium-badge';
        badge.innerHTML = '👑 Premium';
        badge.style.marginLeft = '6px';
        const title = el.querySelector('.exam-title, .card-title, h3, strong');
        if (title && !title.querySelector('.premium-badge')) title.appendChild(badge);
      });
    }

    // ── C. Gate artikel/prompt Unggulan ──
    if (!isVip) {
      // Tandai semua elemen yang punya data-premium="true" atau class featured/unggulan
      document.querySelectorAll('[data-premium="true"], .featured-item, .unggulan-item').forEach(card => {
        gateCard(card);
      });
    }
  }

  function gateCard(card) {
    card.classList.add('content-locked');

    // Blur deskripsi
    card.querySelectorAll('.desc, .description, .card-desc, .artikel-desc, .artikel-deskripsi').forEach(el => {
      el.style.filter = 'blur(4px)';
      el.style.userSelect = 'none';
      el.style.pointerEvents = 'none';
    });

    // Disable & ubah teks tombol
    card.querySelectorAll('a.btn, button.btn, .btn-baca, .btn-buka, a[href]').forEach(btn => {
      if (btn.tagName === 'A') {
        btn.addEventListener('click', e => { e.preventDefault(); showVipPopup(); });
      } else {
        btn.disabled = false;
        btn.addEventListener('click', e => { e.preventDefault(); showVipPopup(); });
      }
      btn.classList.add('btn-premium-locked');
      btn.textContent = '👑 Premium Content';
    });

    // Tambah premium badge jika belum ada
    const titleEl = card.querySelector('h2, h3, .card-title, .artikel-judul');
    if (titleEl && !titleEl.querySelector('.premium-badge')) {
      const badge = document.createElement('span');
      badge.className = 'premium-badge';
      badge.style.marginLeft = '8px';
      badge.innerHTML = '👑 Premium';
      titleEl.appendChild(badge);
    }
  }

  // Expose untuk dipakai halaman lain
  window.AuthGate = { showVipPopup, gateCard };

})();
