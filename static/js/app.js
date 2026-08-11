// State Variables
let currentTheme = 'pink';
let isDarkMode = false;
let currentDate = new Date();
let currentYear = currentDate.getFullYear();
let currentMonth = currentDate.getMonth();

let cyclesData = [];
let monthLogsMap = {};
let yearLogsMap = {};
let summaryData = null;
let currentLogRatings = {};
let isDailyLogReadOnly = false;

let cycleChart = null;

// Initialize App on Page Load
document.addEventListener('DOMContentLoaded', () => {
  checkAuthStatus();
});

// Toast notification
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// Toggle Password Show/Hide
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

// Modal Helpers
function openModal(id) {
  document.getElementById(id).classList.add('show');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

// --- AUTHENTICATION & MULTI-DEVICE ACCOUNT FLOW ---
function setFieldError(fieldId, errorMsg) {
  const input = document.getElementById(fieldId);
  const errEl = document.getElementById(fieldId + 'Error');
  if (input) {
    input.classList.add('is-invalid');
  }
  if (errEl) {
    errEl.textContent = errorMsg;
    errEl.style.display = 'block';
  }
}

function clearFieldError(fieldId) {
  const input = document.getElementById(fieldId);
  const errEl = document.getElementById(fieldId + 'Error');
  if (input) {
    input.classList.remove('is-invalid');
  }
  if (errEl) {
    errEl.textContent = '';
    errEl.style.display = 'none';
  }
}

function clearAllFieldErrors() {
  document.querySelectorAll('.field-error-text').forEach(el => {
    el.textContent = '';
    el.style.display = 'none';
  });
  document.querySelectorAll('.form-control').forEach(el => {
    el.classList.remove('is-invalid');
    el.classList.remove('is-valid');
  });
}

function resetAuthForms() {
  const fields = [
    'loginUsername', 'loginPassword',
    'regUsername', 'regPassword', 'regPasswordConfirm',
    'forgotUsername', 'forgotNewPassword', 'forgotNewPasswordConfirm'
  ];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = '';
      if (id.includes('Password') || id.includes('password')) {
        el.type = 'password';
      }
    }
  });
  document.querySelectorAll('#authModal .toggle-pw-btn').forEach(btn => {
    btn.textContent = '👁️';
  });

  // Khôi phục tên đăng nhập đã ghi nhớ nếu có
  const savedUser = localStorage.getItem('saved_login_username');
  if (savedUser) {
    const loginU = document.getElementById('loginUsername');
    const rememberCb = document.getElementById('loginRememberMe');
    if (loginU) loginU.value = savedUser;
    if (rememberCb) rememberCb.checked = true;
  }

  clearAllFieldErrors();
}

function switchAuthTab(tab) {
  const tabLogin = document.getElementById('tabAuthLogin');
  const tabReg = document.getElementById('tabAuthRegister');
  const formLogin = document.getElementById('formAuthLogin');
  const formReg = document.getElementById('formAuthRegister');
  const formForgot = document.getElementById('formAuthForgot');

  const currentLoginUser = document.getElementById('loginUsername') ? document.getElementById('loginUsername').value.trim() : '';

  resetAuthForms();

  if (tab === 'login') {
    tabLogin.classList.add('active');
    tabReg.classList.remove('active');
    formLogin.style.display = 'block';
    formReg.style.display = 'none';
    if (formForgot) formForgot.style.display = 'none';
    setTimeout(() => {
      const loginU = document.getElementById('loginUsername');
      const loginP = document.getElementById('loginPassword');
      if (loginU && !loginU.value) loginU.focus();
      else if (loginP) loginP.focus();
    }, 100);
  } else if (tab === 'register') {
    tabReg.classList.add('active');
    tabLogin.classList.remove('active');
    formReg.style.display = 'block';
    formLogin.style.display = 'none';
    if (formForgot) formForgot.style.display = 'none';
    setTimeout(() => {
      const regU = document.getElementById('regUsername');
      if (regU) regU.focus();
    }, 100);
  } else if (tab === 'forgot') {
    tabLogin.classList.remove('active');
    tabReg.classList.remove('active');
    formLogin.style.display = 'none';
    formReg.style.display = 'none';
    if (formForgot) {
      formForgot.style.display = 'block';
      const forgotU = document.getElementById('forgotUsername');
      if (forgotU) {
        if (currentLoginUser) forgotU.value = currentLoginUser;
        setTimeout(() => {
          if (forgotU.value) {
            const newP = document.getElementById('forgotNewPassword');
            if (newP) newP.focus();
          } else {
            forgotU.focus();
          }
        }, 100);
      }
    }
  }
}

async function checkAuthStatus() {
  try {
    const res = await fetch('/api/auth/status');
    const data = await res.json();

    document.getElementById('authModal').classList.remove('show');
    document.getElementById('appMain').style.display = 'none';

    if (!data.is_logged_in) {
      resetAuthForms();
      openModal('authModal');
      const loginU = document.getElementById('loginUsername');
      if (loginU && !loginU.value) loginU.focus();
    } else {
      document.getElementById('appMain').style.display = 'block';
      document.getElementById('userWelcomeText').textContent = `Tài khoản: ${data.username}`;
      await loadSettings();
      await loadAllData();
    }
  } catch (err) {
    console.error("Auth status error:", err);
  }
}

async function submitRegister() {
  const usernameInput = document.getElementById('regUsername');
  const username = usernameInput.value.trim();
  const p1 = document.getElementById('regPassword').value.trim();
  const p2 = document.getElementById('regPasswordConfirm').value.trim();

  clearAllFieldErrors();
  let hasError = false;

  if (!username) {
    setFieldError('regUsername', 'Vui lòng nhập tên đăng nhập');
    hasError = true;
  } else if (username.length < 3) {
    setFieldError('regUsername', 'Tên đăng nhập phải có ít nhất 3 ký tự');
    hasError = true;
  }

  if (!p1) {
    setFieldError('regPassword', 'Vui lòng nhập mật khẩu');
    hasError = true;
  } else if (p1.length < 4) {
    setFieldError('regPassword', 'Mật khẩu phải từ 4 ký tự trở lên');
    hasError = true;
  }

  if (!p2) {
    setFieldError('regPasswordConfirm', 'Vui lòng xác nhận mật khẩu');
    hasError = true;
  } else if (p1 !== p2) {
    setFieldError('regPasswordConfirm', 'Mật khẩu xác nhận không khớp');
    hasError = true;
  }

  if (hasError) return;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: p1 })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('saved_login_username', username);
      resetAuthForms();
      showToast("Tạo tài khoản thành công!");
      checkAuthStatus();
    } else {
      const err = data.error || 'Lỗi đăng ký tài khoản';
      if (err.includes('tồn tại') || err.includes('Tên đăng nhập')) {
        setFieldError('regUsername', err);
        usernameInput.focus();
      } else if (err.includes('Mật khẩu')) {
        setFieldError('regPassword', err);
      } else {
        setFieldError('regUsername', err);
      }
    }
  } catch (err) {
    setFieldError('regUsername', 'Đã xảy ra lỗi kết nối máy chủ');
  }
}

async function submitLogin() {
  const usernameInput = document.getElementById('loginUsername');
  const username = usernameInput.value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const remember = document.getElementById('loginRememberMe') ? document.getElementById('loginRememberMe').checked : true;

  clearAllFieldErrors();
  let hasError = false;

  if (!username) {
    setFieldError('loginUsername', 'Vui lòng nhập tên đăng nhập');
    hasError = true;
  }

  if (!password) {
    setFieldError('loginPassword', 'Vui lòng nhập mật khẩu');
    hasError = true;
  }

  if (hasError) return;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, remember })
    });
    const data = await res.json();
    if (res.ok) {
      if (remember) {
        localStorage.setItem('saved_login_username', username);
      } else {
        localStorage.removeItem('saved_login_username');
      }
      resetAuthForms();
      showToast("Đăng nhập thành công!");
      checkAuthStatus();
    } else {
      setFieldError('loginPassword', data.error || 'Tên đăng nhập hoặc mật khẩu không chính xác');
      document.getElementById('loginUsername').classList.add('is-invalid');
    }
  } catch (err) {
    setFieldError('loginPassword', 'Đã xảy ra lỗi kết nối máy chủ');
  }
}

async function submitForgotPassword() {
  const usernameInput = document.getElementById('forgotUsername');
  const username = usernameInput.value.trim();
  const p1 = document.getElementById('forgotNewPassword').value.trim();
  const p2 = document.getElementById('forgotNewPasswordConfirm').value.trim();

  clearAllFieldErrors();
  let hasError = false;

  if (!username) {
    setFieldError('forgotUsername', 'Vui lòng nhập tên đăng nhập');
    hasError = true;
  }

  if (!p1) {
    setFieldError('forgotNewPassword', 'Vui lòng nhập mật khẩu mới');
    hasError = true;
  } else if (p1.length < 4) {
    setFieldError('forgotNewPassword', 'Mật khẩu mới phải từ 4 ký tự trở lên');
    hasError = true;
  }

  if (!p2) {
    setFieldError('forgotNewPasswordConfirm', 'Vui lòng xác nhận mật khẩu mới');
    hasError = true;
  } else if (p1 !== p2) {
    setFieldError('forgotNewPasswordConfirm', 'Mật khẩu xác nhận không khớp');
    hasError = true;
  }

  if (hasError) return;

  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, new_password: p1 })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('saved_login_username', username);
      resetAuthForms();
      showToast("Đặt lại mật khẩu thành công!");
      checkAuthStatus();
    } else {
      setFieldError('forgotUsername', data.error || 'Không tìm thấy tên đăng nhập này');
      usernameInput.focus();
    }
  } catch (err) {
    setFieldError('forgotUsername', 'Đã xảy ra lỗi kết nối máy chủ');
  }
}

async function submitLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  resetAuthForms();
  switchAuthTab('login');
  showToast("Đã đăng xuất");
  checkAuthStatus();
}

function openChangePasswordModal() {
  document.getElementById('oldPassword').value = '';
  document.getElementById('newPassword').value = '';
  clearFieldError('oldPassword');
  clearFieldError('newPassword');
  openModal('changePasswordModal');
}

async function submitChangePassword() {
  const old_password = document.getElementById('oldPassword').value;
  const new_password = document.getElementById('newPassword').value;

  clearFieldError('oldPassword');
  clearFieldError('newPassword');
  let hasError = false;

  if (!old_password) {
    setFieldError('oldPassword', 'Vui lòng nhập mật khẩu hiện tại');
    hasError = true;
  }
  if (!new_password) {
    setFieldError('newPassword', 'Vui lòng nhập mật khẩu mới');
    hasError = true;
  } else if (new_password.length < 4) {
    setFieldError('newPassword', 'Mật khẩu mới phải từ 4 ký tự trở lên');
    hasError = true;
  }

  if (hasError) return;

  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ old_password, new_password })
    });
    const data = await res.json();
    if (res.ok) {
      closeModal('changePasswordModal');
      showToast("Đổi mật khẩu thành công!");
    } else {
      setFieldError('oldPassword', data.error || 'Mật khẩu hiện tại không đúng');
    }
  } catch (err) {
    setFieldError('oldPassword', 'Đã xảy ra lỗi kết nối');
  }
}

// --- THEME & DARK MODE CONTROL ---
function setTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);

  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-color') === theme);
  });

  saveSettingsToServer({ theme: theme });
}

function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  document.documentElement.setAttribute('data-dark', isDarkMode ? 'true' : 'false');
  document.getElementById('darkModeBtn').textContent = isDarkMode ? '☀️' : '🌙';

  saveSettingsToServer({ dark_mode: isDarkMode ? 'true' : 'false' });
}

async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    const settings = await res.json();

    if (settings.theme) {
      currentTheme = settings.theme;
      document.documentElement.setAttribute('data-theme', currentTheme);
      document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-color') === currentTheme);
      });
    }

    if (settings.dark_mode) {
      isDarkMode = (settings.dark_mode === 'true');
      document.documentElement.setAttribute('data-dark', isDarkMode ? 'true' : 'false');
      document.getElementById('darkModeBtn').textContent = isDarkMode ? '☀️' : '🌙';
    }

    if (settings.avg_cycle_length) document.getElementById('settingAvgCycle').value = settings.avg_cycle_length;
    if (settings.avg_period_length) document.getElementById('settingAvgPeriod').value = settings.avg_period_length;
  } catch (err) {
    console.error("Error loading settings:", err);
  }
}

async function saveSettingsToServer(obj) {
  try {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obj)
    });
  } catch (err) {
    console.error("Save settings error:", err);
  }
}

async function saveSettings() {
  const avgC = document.getElementById('settingAvgCycle').value;
  const avgP = document.getElementById('settingAvgPeriod').value;

  await saveSettingsToServer({
    avg_cycle_length: avgC,
    avg_period_length: avgP
  });

  showToast("Lưu cài đặt thành công!");
  loadAllData();
}

// --- DATA LOADING & RENDERING ---
async function loadAllData() {
  await Promise.all([
    loadSummary(),
    loadCycles(),
    loadMonthLogs(),
    loadYearLogs()
  ]);

  renderCalendar();
  renderHeatmap();
  renderChart();
}

async function loadSummary() {
  try {
    const res = await fetch('/api/summary');
    summaryData = await res.json();

    if (summaryData.next_period_start_min && summaryData.next_period_start_max) {
      const minD = formatDateVN(summaryData.next_period_start_min);
      const maxD = formatDateVN(summaryData.next_period_start_max);
      document.getElementById('statNextPeriodRange').textContent = `${minD} - ${maxD}`;
    } else {
      document.getElementById('statNextPeriodRange').textContent = "--/--";
    }

    if (summaryData.ovulation_date) {
      document.getElementById('statOvulation').textContent = formatDateVN(summaryData.ovulation_date);
    } else {
      document.getElementById('statOvulation').textContent = "--/--";
    }

    if (summaryData.fertile_window_start && summaryData.fertile_window_end) {
      const fStart = formatDateVN(summaryData.fertile_window_start);
      const fEnd = formatDateVN(summaryData.fertile_window_end);
      document.getElementById('statFertileRange').textContent = `${fStart} - ${fEnd}`;
    } else {
      document.getElementById('statFertileRange').textContent = "--/--";
    }

    document.getElementById('statMedianCycle').textContent = `${summaryData.median_cycle_length} ngày`;
    document.getElementById('statAvgPeriod').textContent = `Hành kinh: ${summaryData.avg_period_length} ngày (3-6 kỳ gần nhất)`;

    const alertBox = document.getElementById('irregularAlert');
    if (summaryData.is_irregular && summaryData.irregular_message) {
      document.getElementById('irregularMsg').textContent = summaryData.irregular_message;
      alertBox.style.display = 'flex';
    } else {
      alertBox.style.display = 'none';
    }
  } catch (err) {
    console.error("Summary load error:", err);
  }
}

async function loadCycles() {
  try {
    const res = await fetch('/api/cycles');
    cyclesData = await res.json();

    const listEl = document.getElementById('cyclesList');
    listEl.innerHTML = '';

    if (cyclesData.length === 0) {
      listEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 13px;">Chưa có dữ liệu kỳ kinh. Nhấp "+ Ghi mới" để tạo.</div>`;
      return;
    }

    cyclesData.forEach(c => {
      const item = document.createElement('div');
      item.className = 'history-item';

      const sDate = formatDateVN(c.start_date);
      const eDate = c.end_date ? formatDateVN(c.end_date) : 'Đang tiếp diễn';

      let durationText = '';
      if (c.end_date) {
        const d1 = new Date(c.start_date);
        const d2 = new Date(c.end_date);
        const days = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
        durationText = `${days} ngày hành kinh`;
      } else {
        durationText = 'Đang diễn ra';
      }

      item.innerHTML = `
        <div class="history-info">
          <div class="history-dates">${sDate} ➔ ${eDate}</div>
          <div class="history-sub">${durationText} ${c.notes ? '• ' + escapeHtml(c.notes) : ''}</div>
        </div>
        <div class="history-actions">
          <button class="btn-icon-small" title="Sửa" onclick="openEditCycleModal(${c.id})">✏️</button>
          <button class="btn-icon-small" title="Xóa" onclick="deleteCycle(${c.id})">🗑️</button>
        </div>
      `;
      listEl.appendChild(item);
    });
  } catch (err) {
    console.error("Cycles load error:", err);
  }
}

async function loadMonthLogs() {
  const mStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  try {
    const res = await fetch(`/api/logs?month=${mStr}`);
    const logs = await res.json();
    monthLogsMap = {};
    if (logs && Array.isArray(logs)) {
      logs.forEach(l => { monthLogsMap[l.log_date] = l; });
    }
  } catch (err) {
    console.error("Month logs error:", err);
  }
}

async function loadYearLogs() {
  try {
    const res = await fetch(`/api/logs?year=${currentYear}`);
    const logs = await res.json();
    yearLogsMap = {};
    if (logs && Array.isArray(logs)) {
      logs.forEach(l => { yearLogsMap[l.log_date] = l; });
    }
  } catch (err) {
    console.error("Year logs error:", err);
  }
}

// --- CALENDAR RENDERER ---
function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear -= 1;
  } else if (currentMonth > 11) {
    currentMonth = 0;
    currentYear += 1;
  }
  loadMonthLogs().then(() => renderCalendar());
}

function renderCalendar() {
  const titleEl = document.getElementById('calendarMonthYear');
  titleEl.textContent = `Tháng ${currentMonth + 1} năm ${currentYear}`;

  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';

  const dayHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  dayHeaders.forEach(h => {
    const el = document.createElement('div');
    el.className = 'day-header';
    el.textContent = h;
    grid.appendChild(el);
  });

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  let startingDay = firstDayOfMonth.getDay() - 1;
  if (startingDay === -1) startingDay = 6;

  for (let i = 0; i < startingDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day empty';
    grid.appendChild(emptyCell);
  }

  const todayStr = formatDateISO(new Date());

  const periodDays = new Set();
  cyclesData.forEach(c => {
    if (c.start_date) {
      let curr = new Date(c.start_date);
      const end = c.end_date ? new Date(c.end_date) : new Date(c.start_date);
      while (curr <= end) {
        periodDays.add(formatDateISO(curr));
        curr.setDate(curr.getDate() + 1);
      }
    }
  });

  let predictedMin = summaryData ? summaryData.next_period_start_min : null;
  let predictedMax = summaryData ? summaryData.next_period_start_max : null;
  let ovulationDate = summaryData ? summaryData.ovulation_date : null;
  let fertileStart = summaryData ? summaryData.fertile_window_start : null;
  let fertileEnd = summaryData ? summaryData.fertile_window_end : null;

  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(currentYear, currentMonth, day);
    const dateStr = formatDateISO(cellDate);

    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    dayCell.textContent = day;

    if (dateStr === todayStr) dayCell.classList.add('today');

    if (periodDays.has(dateStr)) {
      dayCell.classList.add('period');
    } else if (dateStr === ovulationDate) {
      dayCell.classList.add('ovulation');
    } else if (fertileStart && fertileEnd && dateStr >= fertileStart && dateStr <= fertileEnd) {
      dayCell.classList.add('fertile');
    } else if (predictedMin && predictedMax && dateStr >= predictedMin && dateStr <= predictedMax) {
      dayCell.classList.add('predicted');
    }

    if (monthLogsMap[dateStr]) {
      const dot = document.createElement('div');
      dot.className = 'day-dot';
      dayCell.appendChild(dot);
    }

    dayCell.onclick = () => openDailyLogModal(dateStr, false);
    grid.appendChild(dayCell);
  }
}

// --- YEARLY HEATMAP RENDERER ---
function switchView(view) {
  const calView = document.getElementById('calendarView');
  const hmView = document.getElementById('heatmapView');
  const tabCal = document.getElementById('tabCal');
  const tabHm = document.getElementById('tabHm');
  const titleEl = document.getElementById('viewTitle');

  if (view === 'calendar') {
    calView.style.display = 'block';
    hmView.style.display = 'none';
    tabCal.classList.add('active');
    tabHm.classList.remove('active');
    titleEl.textContent = '📅 Lịch Tháng';
  } else {
    calView.style.display = 'none';
    hmView.style.display = 'block';
    tabCal.classList.remove('active');
    tabHm.classList.add('active');
    titleEl.textContent = `🔥 Heatmap Năm ${currentYear}`;
    renderHeatmap();
  }
}

function renderHeatmap() {
  const container = document.getElementById('heatmapContainer');
  container.innerHTML = '';

  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  for (let m = 0; m < 12; m++) {
    const monthBox = document.createElement('div');
    monthBox.className = 'heatmap-month';

    const title = document.createElement('div');
    title.className = 'heatmap-month-title';
    title.textContent = monthNames[m];
    monthBox.appendChild(title);

    const daysGrid = document.createElement('div');
    daysGrid.className = 'heatmap-days-grid';

    const daysInM = new Date(currentYear, m + 1, 0).getDate();

    for (let d = 1; d <= daysInM; d++) {
      const dateStr = `${currentYear}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const cell = document.createElement('div');
      cell.className = 'hm-cell';
      cell.title = dateStr;

      const log = yearLogsMap[dateStr];
      let level = 0;
      if (log) {
        level = 1;
        if (log.flow_level === 'light' || log.flow_level === 'spotting') level = 2;
        if (log.flow_level === 'medium') level = 3;
        if (log.flow_level === 'heavy') level = 4;

        if (log.symptoms && typeof log.symptoms === 'object') {
          const maxRating = Math.max(0, ...Object.values(log.symptoms));
          if (maxRating >= 4) level = 4;
          else if (maxRating >= 3 && level < 3) level = 3;
        }
      }
      cell.setAttribute('data-level', level);
      cell.onclick = () => openDailyLogModal(dateStr, true);

      daysGrid.appendChild(cell);
    }

    monthBox.appendChild(daysGrid);
    container.appendChild(monthBox);
  }
}

// --- DAILY SYMPTOM LOG MODAL & RATING 1-5 ---
async function openDailyLogModal(dateStr, isReadOnly = false) {
  isDailyLogReadOnly = isReadOnly;
  document.getElementById('logDate').value = dateStr;
  
  const titlePrefix = isReadOnly ? '👀 Xem Nhật Ký' : 'Nhật Ký';
  document.getElementById('logModalTitle').textContent = `${titlePrefix} Ngày ${formatDateVN(dateStr)}`;

  const badge = document.getElementById('logReadOnlyBadge');
  if (badge) badge.style.display = isReadOnly ? 'block' : 'none';

  const btnSave = document.getElementById('btnSaveDailyLog');
  if (btnSave) btnSave.style.display = isReadOnly ? 'none' : 'inline-flex';

  const btnClose = document.getElementById('btnCloseDailyLog');
  if (btnClose) btnClose.textContent = isReadOnly ? 'Đóng' : 'Hủy';

  const flowEl = document.getElementById('logFlowLevel');
  const moodEl = document.getElementById('logMood');
  const notesEl = document.getElementById('logNotes');

  flowEl.value = '';
  moodEl.value = '';
  notesEl.value = '';
  currentLogRatings = {};
  resetStarRatingsUI();

  flowEl.disabled = isReadOnly;
  moodEl.disabled = isReadOnly;
  notesEl.readOnly = isReadOnly;
  notesEl.placeholder = isReadOnly ? 'Chưa có ghi chú...' : 'Nhập cảm nhận của bạn...';

  document.querySelectorAll('#logModal .star-btn').forEach(btn => {
    btn.style.cursor = isReadOnly ? 'default' : 'pointer';
    btn.style.pointerEvents = isReadOnly ? 'none' : 'auto';
  });

  try {
    const res = await fetch(`/api/logs?date=${dateStr}`);
    const log = await res.json();
    if (log) {
      if (log.flow_level) flowEl.value = log.flow_level;
      if (log.mood) moodEl.value = log.mood;
      if (log.notes) notesEl.value = log.notes;
      if (log.symptoms && typeof log.symptoms === 'object') {
        currentLogRatings = log.symptoms;
        updateStarRatingsUI();
      }
    }
  } catch (err) {
    console.error("Log fetch error:", err);
  }

  openModal('logModal');
}

function setRating(symptomKey, score) {
  if (isDailyLogReadOnly) return;
  if (currentLogRatings[symptomKey] === score) {
    delete currentLogRatings[symptomKey];
  } else {
    currentLogRatings[symptomKey] = score;
  }
  updateStarRatingsUI();
}

function resetStarRatingsUI() {
  document.querySelectorAll('.rating-stars').forEach(group => {
    group.querySelectorAll('.star-btn').forEach(btn => btn.classList.remove('active'));
  });
}

function updateStarRatingsUI() {
  resetStarRatingsUI();
  Object.keys(currentLogRatings).forEach(sym => {
    const val = currentLogRatings[sym];
    const group = document.querySelector(`.rating-stars[data-symptom="${sym}"]`);
    if (group) {
      group.querySelectorAll('.star-btn').forEach(btn => {
        if (parseInt(btn.textContent) === val) {
          btn.classList.add('active');
        }
      });
    }
  });
}

async function saveDailyLog() {
  const log_date = document.getElementById('logDate').value;
  const flow_level = document.getElementById('logFlowLevel').value;
  const mood = document.getElementById('logMood').value;
  const notes = document.getElementById('logNotes').value;

  try {
    const res = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        log_date,
        flow_level,
        mood,
        symptoms: currentLogRatings,
        notes
      })
    });
    if (res.ok) {
      closeModal('logModal');
      showToast("Lưu nhật ký ngày thành công!");
      await loadMonthLogs();
      await loadYearLogs();
      renderCalendar();
      renderHeatmap();
    }
  } catch (err) {
    alert("Đã xảy ra lỗi khi lưu nhật ký");
  }
}

// --- CYCLE ADD / EDIT / DELETE MODAL ---
function openAddCycleModal() {
  document.getElementById('cycleId').value = '';
  document.getElementById('cycleModalTitle').textContent = 'Thêm Kỳ Kinh Nguyệt';
  document.getElementById('cycleStartDate').value = formatDateISO(new Date());
  document.getElementById('cycleEndDate').value = '';
  document.getElementById('cycleNotes').value = '';
  openModal('cycleModal');
}

function openEditCycleModal(id) {
  const c = cyclesData.find(item => item.id === id);
  if (!c) return;

  document.getElementById('cycleId').value = c.id;
  document.getElementById('cycleModalTitle').textContent = 'Sửa Kỳ Kinh Nguyệt';
  document.getElementById('cycleStartDate').value = c.start_date;
  document.getElementById('cycleEndDate').value = c.end_date || '';
  document.getElementById('cycleNotes').value = c.notes || '';
  openModal('cycleModal');
}

async function saveCycle() {
  const id = document.getElementById('cycleId').value;
  const start_date = document.getElementById('cycleStartDate').value;
  const end_date = document.getElementById('cycleEndDate').value;
  const notes = document.getElementById('cycleNotes').value;

  if (!start_date) {
    alert("Ngày bắt đầu là bắt buộc!");
    return;
  }

  const url = id ? `/api/cycles/${id}` : '/api/cycles';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_date, end_date, notes })
    });
    if (res.ok) {
      closeModal('cycleModal');
      showToast(id ? "Cập nhật kỳ kinh thành công!" : "Thêm kỳ kinh thành công!");
      loadAllData();
    } else {
      const d = await res.json();
      alert(d.error || "Lỗi lưu kỳ kinh");
    }
  } catch (err) {
    alert("Đã xảy ra lỗi kết nối");
  }
}

async function deleteCycle(id) {
  if (!confirm("Bạn có chắc chắn muốn xóa kỳ kinh nguyệt này không?")) return;

  try {
    const res = await fetch(`/api/cycles/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast("Đã xóa kỳ kinh!");
      loadAllData();
    }
  } catch (err) {
    alert("Đã xảy ra lỗi khi xóa");
  }
}

// --- CHART.JS VISUALIZATION ---
function renderChart() {
  const ctx = document.getElementById('cycleChart').getContext('2d');

  if (cyclesData.length < 2) {
    if (cycleChart) cycleChart.destroy();
    return;
  }

  const labels = [];
  const lengths = [];

  const sortedCycles = [...cyclesData].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  for (let i = 1; i < sortedCycles.length; i++) {
    const prev = new Date(sortedCycles[i - 1].start_date);
    const curr = new Date(sortedCycles[i].start_date);
    const len = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (len >= 15 && len <= 60) {
      labels.push(formatDateVN(sortedCycles[i].start_date));
      lengths.push(len);
    }
  }

  if (cycleChart) cycleChart.destroy();

  cycleChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Độ dài chu kỳ (ngày)',
        data: lengths,
        borderColor: '#f4acb7',
        backgroundColor: 'rgba(244, 172, 183, 0.2)',
        borderWidth: 3,
        tension: 0.3,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 20,
          max: 40,
          ticks: { stepSize: 2 }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// --- UTILITY FUNCTIONS ---
function formatDateISO(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateVN(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
