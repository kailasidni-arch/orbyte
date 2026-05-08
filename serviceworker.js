// ===================================================
//  ORBYTE UniAttend — Upgraded script.js
//  Features: PWA, Push Notifications, Leave Requests,
//  Check-in Validation (QR/GPS), Admin Approvals,
//  Excel Export (SheetJS), Audit Logs, Structured DB
// ===================================================

// ===================================================
//  STORAGE KEYS (structured mini-database)
// ===================================================
const KEYS = {
  session:          'uniattend_session',
  lecturers:        'orbyte_lecturers',
  students:         'orbyte_students',
  schedules:        'orbyte_schedules',
  attendanceRecs:   'orbyte_attendanceRecords',
  leaveRequests:    'orbyte_leaveRequests',
  notifications:    'orbyte_notifications',
  auditLogs:        'orbyte_auditLogs',
  settings:         'orbyte_settings',
  theme:            'uniattend_theme',
  lecState:         'uniattend_lec',
};

// ===================================================
//  STORAGE HELPERS
// ===================================================
function ls_get(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function ls_set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
function ls_remove(key) { try { localStorage.removeItem(key); } catch {} }

// ===================================================
//  SETTINGS
// ===================================================
const DEFAULT_SETTINGS = {
  lateThreshold: 15,
  absentThreshold: 30,
  workStart: '08:00',
  workEnd: '17:00',
  validationMode: 'none',
  qrCode: 'ORBYTE-CAMPUS-2025',
  campusLat: -6.285,
  campusLng: 107.1706,
  campusRadius: 75,
  autoCheckout: true,
  maxGpsAccuracy: 150,
  notifyLate: true,
  notifyAbsent: true,
  notifyLeave: true,
  notifyWeekend: false,
};

function getSettings() {
  return { ...DEFAULT_SETTINGS, ...(ls_get(KEYS.settings, {})) };
}
function saveSettings(s) { ls_set(KEYS.settings, s); }

// ===================================================
//  DEMO ACCOUNTS
// ===================================================
const DEMO_ACCOUNTS = {
  lecturer: { id: 'CE-2041', password: 'ahmad123',   role: 'lecturer', name: 'Ahmad Hafiz',   fullName: 'Ahmad Hafiz bin Abdullah', dept: 'Civil Engineering', initials: 'AH', email: 'ahmad.hafiz@president.ac.id' },
  admin:    { id: 'admin',   password: 'admin123',   role: 'admin',    name: 'Admin',         fullName: 'System Administrator',    dept: 'Administration',   initials: 'A',  email: 'admin@president.ac.id' },
  student:  { id: 'STU-0001', password: 'aiman123', role: 'student',  name: 'Aiman Danial',  fullName: 'Aiman Danial bin Razif',  dept: 'Computer Science', initials: 'AD', email: 'aiman.danial@president.ac.id' }
};

// ===================================================
//  DATA GENERATION
// ===================================================
const DEPARTMENTS = ['Civil Engineering', 'Computer Science', 'Architecture', 'Mechanical Engineering'];
const DEPT_PREFIX = { 'Civil Engineering': 'CE', 'Computer Science': 'CS', 'Architecture': 'AR', 'Mechanical Engineering': 'ME' };
const DEPT_COLORS = { 'Civil Engineering': '#1D4ED8', 'Computer Science': '#7c3aed', 'Architecture': '#D97706', 'Mechanical Engineering': '#16A34A' };
const AVATAR_COLORS = ['#1D4ED8','#7c3aed','#D97706','#16A34A','#DC2626','#0891b2'];

const NAMES = [
  'Ahmad Hafiz','Nurul Ain','Rizwan Shah','Farah Liyana','Hafizuddin Zain',
  'Salmah Idris','Omar Khalid','Zainab Hassan','Mohd Fadzli','Suraya Kamal',
  'Azri Nizam','Nadia Aziz','Iskandar Putra','Ramlah Yunus','Faris Amran',
  'Hasrul Anuar','Asmah Daud','Zulkifli Hamid','Rohani Majid','Khairul Anam',
  'Norsyazwani Ghani','Ruzaini Bakar','Halimah Nordin','Sabri Osman','Mastura Rahim',
  'Ezwan Fauzi','Norzaiti Mohd','Shahril Azam','Jamilah Wahab','Adlan Rosli',
  'Munirah Salleh','Zulaikha Musa','Hairul Azam','Norhidayah Ali','Farhan Zakaria',
  'Siti Norbaya','Amir Hamzah','Zuraidah Taib','Rashdan Ibrahim','Noor Hafiza',
  'Burhan Suleiman','Mariam Nasir','Hazwan Rafi','Latifah Mokhtar','Syazwan Azri',
  'Norashikin Desa','Razif Zainal','Husna Sulaiman','Eizwan Ariff','Paridah Tahir'
];

const LEC_SUBJECTS = [
  { code:'CE301', name:'Structural Analysis', credits:3 },
  { code:'CE302', name:'Fluid Mechanics', credits:3 },
  { code:'CE303', name:'Soil Mechanics', credits:3 },
  { code:'CS301', name:'Data Structures', credits:3 },
  { code:'CS302', name:'Operating Systems', credits:3 },
  { code:'CS303', name:'Web Technologies', credits:3 },
  { code:'AR301', name:'Architectural Design', credits:3 },
  { code:'ME301', name:'Thermodynamics', credits:3 },
];

// Teaching schedule for main demo lecturer (CE-2041)
const LEC_TIMETABLE = [
  { day: 1, time: '08:00', endTime: '10:00', code: 'CE301', room: 'Block A-101' },
  { day: 2, time: '10:00', endTime: '12:00', code: 'CE302', room: 'Lab B-203' },
  { day: 3, time: '08:00', endTime: '10:00', code: 'CE303', room: 'Block C-105' },
  { day: 4, time: '14:00', endTime: '16:00', code: 'CE301', room: 'Block A-101' },
  { day: 5, time: '10:00', endTime: '12:00', code: 'CE302', room: 'Lab B-203' },
];

function genID(dept, idx) { return DEPT_PREFIX[dept] + '-' + String(2000 + idx).padStart(4,'0'); }

function randomTime(baseH, baseM, varM) {
  const total = baseH * 60 + baseM + Math.floor(Math.random() * varM * 2) - varM;
  const h = Math.floor(total / 60), m = total % 60;
  return `${String(h).padStart(2,'0')}:${String(m < 0 ? 0 : m).padStart(2,'0')}`;
}

function calcDuration(checkIn, checkOut) {
  if (!checkIn || !checkOut) return '—';
  const [ih, im] = checkIn.split(':').map(Number);
  const [oh, om] = checkOut.split(':').map(Number);
  const diff = (oh * 60 + om) - (ih * 60 + im);
  if (diff <= 0) return '—';
  const h = Math.floor(diff / 60), m = diff % 60;
  return `${h}h ${String(m).padStart(2,'0')}m`;
}

function generateDataset() {
  const lecturers = NAMES.map((name, i) => ({
    name, dept: DEPARTMENTS[i % DEPARTMENTS.length],
    id: genID(DEPARTMENTS[i % DEPARTMENTS.length], i + 1),
    email: `${name.toLowerCase().replace(/\s/g,'.')}@university.edu.my`,
    initials: name.split(' ').slice(0,2).map(w=>w[0]).join(''),
    avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
    subjects: LEC_SUBJECTS.filter((_,si) => si % DEPARTMENTS.length === i % DEPARTMENTS.length).map(s=>s.code),
  }));

  const records = [];
  const today = new Date();
  for (let d = 0; d < 14; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue;
    const dateStr = date.toISOString().split('T')[0];
    lecturers.forEach(lec => {
      const rand = Math.random();
      let status, checkIn, checkOut, duration, reason = '';
      if (rand < 0.60) {
        status = 'Present';
        checkIn = randomTime(7, 45, 20);
        checkOut = randomTime(17, 0, 30);
        duration = calcDuration(checkIn, checkOut);
      } else if (rand < 0.78) {
        status = 'Late';
        checkIn = randomTime(8, 40, 25);
        checkOut = randomTime(17, 10, 20);
        duration = calcDuration(checkIn, checkOut);
      } else if (rand < 0.88) {
        status = 'Absent'; checkIn = ''; checkOut = ''; duration = '';
      } else if (rand < 0.93) {
        status = 'Leave'; checkIn = ''; checkOut = ''; duration = ''; reason = 'Medical leave';
      } else if (rand < 0.97) {
        status = 'Online'; checkIn = randomTime(8,0,10); checkOut = randomTime(10,0,10); duration = calcDuration(checkIn, checkOut); reason = 'Remote teaching';
      } else {
        status = 'Reschedule'; checkIn = ''; checkOut = ''; duration = ''; reason = 'Rescheduled to next week';
      }
      records.push({ name: lec.name, id: lec.id, dept: lec.dept, date: dateStr, checkIn, checkOut, duration, status, reason });
    });
  }
  return { records, lecturers };
}

function initDatabase() {
  const existing = ls_get(KEYS.attendanceRecs, null);
  if (existing && existing.length > 10) return; // already initialized
  const { records, lecturers } = generateDataset();
  ls_set(KEYS.attendanceRecs, records);
  ls_set(KEYS.lecturers, lecturers);
  ls_set(KEYS.leaveRequests, []);
  ls_set(KEYS.auditLogs, []);
  if (!ls_get(KEYS.notifications)) ls_set(KEYS.notifications, {});
}

function getRecords()       { return ls_get(KEYS.attendanceRecs, []); }
function getLecturers()     { return ls_get(KEYS.lecturers, []); }
function getLeaveRequests() { return ls_get(KEYS.leaveRequests, []); }
function getAuditLogs()     { return ls_get(KEYS.auditLogs, []); }

// ===================================================
//  STATE
// ===================================================
let adminState = { filtered: [], sortCol: 'date', sortDir: 'desc', page: 1, perPage: 10 };
let selectedRole = 'lecturer';
let stuRefreshInterval = null;

// ===================================================
//  AUDIT LOG
// ===================================================
function addAuditLog(action, actor, detail, type = 'info') {
  const logs = getAuditLogs();
  const entry = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    action,
    actor,
    detail,
    type, // check-in, check-out, leave-request, approval, settings, export
  };
  logs.unshift(entry);
  ls_set(KEYS.auditLogs, logs.slice(0, 500)); // keep last 500
}

// ===================================================
//  AUTO-ABSENCE MARKING (for demo presentation)
// ===================================================
function ensureAbsenceRecords() {
  const records = getRecords();
  const requests = getLeaveRequests();
  const lecturers = getLecturers();
  const today = new Date().toISOString().split('T')[0];
  
  // For each lecturer and past date with no record, check if they should be marked absent
  const processed = new Set();
  
  lecturers.forEach(lec => {
    for (let d = 1; d <= 14; d++) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const dow = date.getDay();
      if (dow === 0 || dow === 6) continue; // skip weekends
      const dateStr = date.toISOString().split('T')[0];
      const key = `${lec.id}_${dateStr}`;
      if (processed.has(key)) continue;
      processed.add(key);
      
      // Check if record exists
      const hasRecord = records.some(r => r.id === lec.id && r.date === dateStr);
      if (hasRecord) continue;
      
      // Check if approved leave exists for this date
      const hasApprovedLeave = requests.some(r => 
        r.lecturerId === lec.id && 
        r.date === dateStr && 
        r.status === 'Approved'
      );
      if (hasApprovedLeave) continue;
      
      // Mark as absent if no record and no approved leave
      if (dateStr < today) {
        records.push({ 
          name: lec.name, 
          id: lec.id, 
          dept: lec.dept, 
          date: dateStr, 
          checkIn: '', 
          checkOut: '', 
          duration: '', 
          status: 'Absent',
          reason: 'No check-in record' 
        });
      }
    }
  });
  
  ls_set(KEYS.attendanceRecs, records);
}

// ===================================================
//  ENHANCED STATISTICS & SUMMARIES
// ===================================================
function getWeeklyStats(lecturerId = null) {
  const records = getRecords();
  const filtered = lecturerId ? records.filter(r => r.id === lecturerId) : records;
  
  const stats = {
    total: 0, present: 0, late: 0, absent: 0, leave: 0, online: 0, reschedule: 0,
    rate: 0, lateRate: 0, days: {}
  };
  
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  filtered.forEach(r => {
    stats.total++;
    stats[r.status?.toLowerCase() || 'absent']++;
    const d = new Date(r.date);
    const dow = dayNames[d.getDay()];
    if (!stats.days[dow]) stats.days[dow] = { present: 0, late: 0, absent: 0, total: 0 };
    stats.days[dow].total++;
    if (r.status === 'Present') stats.days[dow].present++;
    if (r.status === 'Late') stats.days[dow].late++;
    if (r.status === 'Absent') stats.days[dow].absent++;
  });
  
  if (stats.total > 0) {
    stats.rate = Math.round((stats.present / stats.total) * 100);
    stats.lateRate = Math.round((stats.late / stats.total) * 100);
  }
  
  return stats;
}

function getLecturerDetailStats(lecturerId) {
  const records = getRecords().filter(r => r.id === lecturerId);
  const requests = getLeaveRequests().filter(r => r.lecturerId === lecturerId);
  
  const today = new Date().toISOString().split('T')[0];
  const lastMonth = new Date();
  lastMonth.setDate(lastMonth.getDate() - 30);
  const lastMonthStr = lastMonth.toISOString().split('T')[0];
  const thisMonth = records.filter(r => r.date >= lastMonthStr);
  const pending = requests.filter(r => r.status === 'Pending').length;
  const approved = requests.filter(r => r.status === 'Approved').length;
  
  return {
    totalDays: records.length,
    presentDays: records.filter(r => r.status === 'Present').length,
    lateDays: records.filter(r => r.status === 'Late').length,
    absentDays: records.filter(r => r.status === 'Absent').length,
    leaveDays: records.filter(r => r.status === 'Leave' || r.status === 'Online').length,
    attendanceRate: records.length ? Math.round((records.filter(r => r.status === 'Present').length / records.length) * 100) : 0,
    lastMonthRate: thisMonth.length ? Math.round((thisMonth.filter(r => r.status === 'Present').length / thisMonth.length) * 100) : 0,
    pendingRequests: pending,
    approvedRequests: approved,
  };
}

// ===================================================
//  NOTIFICATIONS SYSTEM
// ===================================================
let swRegistration = null;

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.register('/service-worker.js');
    } catch (e) { console.warn('SW registration failed:', e); }
  }
}

function getStudentNotifications(studentId) {
  const all = ls_get(KEYS.notifications, {});
  return all[studentId] || [];
}

function saveStudentNotifications(studentId, notifs) {
  const all = ls_get(KEYS.notifications, {});
  all[studentId] = notifs.slice(0, 100); // keep last 100
  ls_set(KEYS.notifications, all);
}

function addNotification(studentId, notif) {
  const notifs = getStudentNotifications(studentId);
  const entry = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    title: notif.title,
    body: notif.body,
    type: notif.type || 'info', // warning, info, success, danger
    read: false,
    icon: notif.icon || '🔔',
  };
  notifs.unshift(entry);
  saveStudentNotifications(studentId, notifs);
  updateNotifBadge(studentId);
  // Try browser notification
  tryBrowserNotification(entry.title, entry.body);
  return entry;
}

function tryBrowserNotification(title, body) {
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png' });
    } catch {}
  } else {
    // Fallback: toast
    showToast(`🔔 ${title}: ${body}`, 'warning');
  }
}

async function requestNotificationPermission() {
  // Auto-enable: langsung aktifkan notifikasi in-app tanpa minta izin browser
  const label = document.getElementById('notifStatusLabel');
  const btn = document.getElementById('enableNotifBtn');
  if (btn) { btn.textContent = '✓ Notifications Enabled'; btn.disabled = true; btn.style.opacity = '.6'; }
  if (label) label.textContent = '✓ Notifications enabled';
  showToast('✓ Push notifications enabled!', 'success');
}

function autoEnableNotifications() {
  // Otomatis aktifkan saat student login, tanpa popup izin
  const btn = document.getElementById('enableNotifBtn');
  const label = document.getElementById('notifStatusLabel');
  if (btn) { btn.textContent = '✓ Notifications Enabled'; btn.disabled = true; btn.style.opacity = '.6'; }
  if (label) label.textContent = '✓ Active';
}

function updateNotifBadge(studentId) {
  const notifs = getStudentNotifications(studentId);
  const unread = notifs.filter(n => !n.read).length;
  const dot = document.getElementById('stuNotifDot');
  const count = document.getElementById('stuNotifCount');
  if (dot) dot.style.display = unread > 0 ? 'block' : 'none';
  if (count) {
    count.style.display = unread > 0 ? 'flex' : 'none';
    count.textContent = unread > 9 ? '9+' : unread;
  }
}

function renderNotifPanel(studentId) {
  const notifs = getStudentNotifications(studentId);
  const body = document.getElementById('notifPanelBody');
  if (!body) return;
  if (!notifs.length) {
    body.innerHTML = `<div class="notif-empty"><svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 4a10 10 0 0110 10v5l2 3H4l2-3V14A10 10 0 0116 4z" stroke="currentColor" stroke-width="1.5"/><path d="M13 27a3 3 0 006 0" stroke="currentColor" stroke-width="1.5"/></svg><p>No notifications yet</p></div>`;
    return;
  }
  const iconMap = { warning: 'ni-warning', info: 'ni-info', success: 'ni-success', danger: 'ni-danger' };
  const emojiMap = { warning: '⚠️', info: 'ℹ️', success: '✅', danger: '❌' };
  body.innerHTML = notifs.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotifRead('${studentId}', '${n.id}')">
      <div class="notif-icon ${iconMap[n.type] || 'ni-info'}">${n.icon || emojiMap[n.type] || '🔔'}</div>
      <div class="notif-content">
        <div class="notif-title">${escHtml(n.title)}</div>
        <div class="notif-body">${escHtml(n.body)}</div>
        <div class="notif-time">${formatTimeAgo(n.timestamp)}</div>
      </div>
    </div>`).join('');
}

function markNotifRead(studentId, id) {
  const notifs = getStudentNotifications(studentId);
  const n = notifs.find(x => String(x.id) === String(id));
  if (n) { n.read = true; saveStudentNotifications(studentId, notifs); }
  updateNotifBadge(studentId);
  renderNotifPanel(studentId);
}

function markAllNotifsRead(studentId) {
  const notifs = getStudentNotifications(studentId);
  notifs.forEach(n => n.read = true);
  saveStudentNotifications(studentId, notifs);
  updateNotifBadge(studentId);
  renderNotifPanel(studentId);
}

function openNotifPanel() {
  document.getElementById('notifPanel').classList.add('open');
  document.getElementById('notifPanelBackdrop').classList.add('active');
  const s = getSession();
  if (s) renderNotifPanel(s.id);
}
function closeNotifPanel() {
  document.getElementById('notifPanel').classList.remove('open');
  document.getElementById('notifPanelBackdrop').classList.remove('active');
}

function renderRecentNotifs(studentId) {
  const notifs = getStudentNotifications(studentId).slice(0, 3);
  const container = document.getElementById('stuRecentNotifs');
  if (!container) return;
  if (!notifs.length) { container.innerHTML = `<div style="padding:12px 0;color:var(--text-muted);font-size:13px;">No recent notifications.</div>`; return; }
  const emojiMap = { warning: '⚠️', info: 'ℹ️', success: '✅', danger: '❌' };
  container.innerHTML = notifs.map(n => `
    <div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:flex-start;">
      <span style="font-size:16px;">${n.icon || emojiMap[n.type] || '🔔'}</span>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:500;">${escHtml(n.title)}</div>
        <div style="font-size:12px;color:var(--text-muted);">${escHtml(n.body)}</div>
        <div style="font-size:11px;color:var(--text-faint);margin-top:2px;">${formatTimeAgo(n.timestamp)}</div>
      </div>
    </div>`).join('');
}

// Simulate notifications for leave events
function broadcastLeaveNotification(leaveReq) {
  const STUDENT_ID = 'STU-0001';
  const typeLabels = { Late: 'will be late', Absent: 'is absent', Online: 'moving class online', Reschedule: 'rescheduling class' };
  const icons = { Late: '🕐', Absent: '❌', Online: '💻', Reschedule: '📅' };
  addNotification(STUDENT_ID, {
    title: `Class Alert: ${leaveReq.type}`,
    body: `${leaveReq.lecturerName} ${typeLabels[leaveReq.type] || 'has submitted a request'} for ${leaveReq.classCode} on ${leaveReq.date}.`,
    type: leaveReq.type === 'Absent' ? 'danger' : 'warning',
    icon: icons[leaveReq.type] || '🔔',
  });
}

function broadcastApprovalNotification(leaveReq, decision, adminNote) {
  const STUDENT_ID = 'STU-0001';
  const isApproved = decision === 'Approved';
  addNotification(STUDENT_ID, {
    title: `Request ${decision}: ${leaveReq.classCode}`,
    body: `Admin has ${decision.toLowerCase()} the ${leaveReq.type} request for ${leaveReq.lecturerName}.${adminNote ? ' Note: ' + adminNote : ''}`,
    type: isApproved ? 'warning' : 'info',
    icon: isApproved ? '✅' : '❌',
  });
}

// ===================================================
//  UTILITIES
// ===================================================
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatTimeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function showSkeleton(msg = 'Loading…') {
  document.getElementById('skeletonText').textContent = msg;
  document.getElementById('skeletonOverlay').classList.add('active');
}
function hideSkeleton() { document.getElementById('skeletonOverlay').classList.remove('active'); }
function withSkeleton(fn, msg = 'Loading…', delay = 700) {
  showSkeleton(msg);
  setTimeout(() => { hideSkeleton(); fn(); }, delay);
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  const icon = toast.querySelector('.toast-icon');
  document.getElementById('toastMsg').textContent = msg;
  toast.classList.remove('error','warning');
  if (type === 'error') { toast.classList.add('error'); icon.style.background='rgba(255,255,255,.25)'; }
  else if (type === 'warning') { toast.classList.add('warning'); icon.style.background='rgba(255,255,255,.25)'; }
  else { icon.style.background='var(--success)'; }
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 3400);
}

function fmtDate(ds) {
  if (!ds) return '—';
  const d = new Date(ds + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
function fmtDay(ds) {
  if (!ds) return '';
  return new Date(ds + 'T00:00:00').toLocaleDateString('en-GB', { weekday:'long' });
}

function chipHtml(status) {
  const cls = (status || '').toLowerCase().replace(/\s/g, '-');
  return `<span class="chip ${cls}">${escHtml(status)}</span>`;
}

function isLate(t) {
  if (!t) return false;
  const settings = getSettings();
  const [sh, sm] = settings.workStart.split(':').map(Number);
  const lateMinutes = sm + settings.lateThreshold;
  const [h, m] = t.split(':').map(Number);
  const total = h * 60 + m;
  const threshold = sh * 60 + lateMinutes;
  return total > threshold;
}

// ===================================================
//  SESSION
// ===================================================
function getSession() {
  try {
    const lsData = localStorage.getItem(KEYS.session);
    const ssData = sessionStorage.getItem(KEYS.session);
    const s = lsData ? JSON.parse(lsData) : ssData ? JSON.parse(ssData) : null;
    return s;
  } catch { return null; }
}
function saveSession(data) { try { localStorage.setItem(KEYS.session, JSON.stringify(data)); } catch {} }
function clearSession() { try { localStorage.removeItem(KEYS.session); sessionStorage.removeItem(KEYS.session); } catch {} }

function applySession(s) {
  if (!s) return;
  if (s.role === 'lecturer') {
    const first = s.name.split(' ')[0];
    document.getElementById('lecGreetName').textContent = first;
    document.getElementById('lecNavName').textContent = s.name;
    document.getElementById('lecNavAvatar').textContent = s.initials;
    document.getElementById('lecIdLabel').textContent = s.id;
    document.getElementById('lecDeptLabel').textContent = s.dept;
    document.getElementById('profileAvatarEl').textContent = s.initials;
    document.getElementById('profileNameEl').textContent = s.fullName;
    document.getElementById('profileTitleEl').textContent = `Senior Lecturer · ${s.dept}`;
    document.getElementById('pfStaffId').textContent = s.id;
    document.getElementById('pfEmail').textContent = s.email;
    document.getElementById('pfDept').textContent = s.dept;
    // Populate leave class dropdown
    populateLeaveClassDropdown(s.id);
  } else if (s.role === 'student') {
    const first = s.name.split(' ')[0];
    const el = (id) => document.getElementById(id);
    if (el('stuGreetName')) el('stuGreetName').textContent = first;
    if (el('stuNavName')) el('stuNavName').textContent = s.name;
    if (el('stuNavAvatar')) el('stuNavAvatar').textContent = s.initials;
    if (el('stuProfileAvatar')) el('stuProfileAvatar').textContent = s.initials;
    if (el('stuProfileName')) el('stuProfileName').textContent = s.fullName;
    if (el('stuProfileId')) el('stuProfileId').textContent = s.id;
    if (el('stuProfileEmail')) el('stuProfileEmail').textContent = s.email;
    if (el('stuProfileSub')) el('stuProfileSub').textContent = s.dept + ' · Year 2';
    updateNotifBadge(s.id);
    // Update notification button state
    updateNotifEnableButton();
  } else {
    document.getElementById('adminSidebarAvatar').textContent = s.initials;
    document.getElementById('adminSidebarName').textContent = s.name;
  }
}

function restoreSession() {
  const s = getSession();
  if (s) { applySession(s); showView(s.role); }
  else showLoginPage();
}

// ===================================================
//  PAGE ROUTING
// ===================================================
function showLoginPage() {
  document.getElementById('loginPage').classList.add('active');
  document.getElementById('lecturerView').classList.remove('active');
  document.getElementById('adminView').classList.remove('active');
  document.getElementById('studentView').classList.remove('active');
  resetLoginForm();
  if (stuRefreshInterval) { clearInterval(stuRefreshInterval); stuRefreshInterval = null; }
  setTimeout(() => document.getElementById('loginId').focus(), 100);
}

function showView(role) {
  document.getElementById('loginPage').classList.remove('active');
  document.getElementById('lecturerView').classList.remove('active');
  document.getElementById('adminView').classList.remove('active');
  document.getElementById('studentView').classList.remove('active');

  if (role === 'lecturer') {
    document.getElementById('lecturerView').classList.add('active');
    initLiveClock();
    initDateStrings();
    renderLecturerStatus();
    renderQuickHistory();
    renderLecturerQuickStats();
    renderLecToday();
    renderPendingLeaveAlert();
    initGPSPanel();
  } else if (role === 'student') {
    document.getElementById('studentView').classList.add('active');
    renderStudentDashboard();
    // Auto-aktifkan notifikasi tanpa popup
    setTimeout(autoEnableNotifications, 500);
    // Auto-refresh every 30 seconds
    if (stuRefreshInterval) clearInterval(stuRefreshInterval);
    stuRefreshInterval = setInterval(() => {
      const s = getSession();
      if (s && s.role === 'student') renderStudentTodaySchedule();
    }, 30000);
  } else {
    document.getElementById('adminView').classList.add('active');
    initDateStrings();
    setDefaultDateFilters(); // Initialize filter date range
    updateDashboard();
    applyAdminFilters();
    renderAdminQuickStats();
    renderActivityFeed();
    updateApprovalBadge();
    loadAdminSettings();
    // Auto-refresh admin view every 10 seconds
    if (stuRefreshInterval) clearInterval(stuRefreshInterval);
    stuRefreshInterval = setInterval(() => {
      const s = getSession();
      if (s && s.role === 'admin') {
        updateDashboard();
        applyAdminFilters();
        renderActivityFeed();
        updateApprovalBadge();
      }
    }, 10000);
  }
}

// ===================================================
//  LOGIN FORM
// ===================================================
document.getElementById('roleLecturerBtn').addEventListener('click', () => setRole('lecturer'));
document.getElementById('roleAdminBtn').addEventListener('click', () => setRole('admin'));
document.getElementById('roleStudentBtn').addEventListener('click', () => setRole('student'));

function setRole(role) {
  selectedRole = role;
  ['roleLecturerBtn','roleAdminBtn','roleStudentBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const btnRole = id === 'roleLecturerBtn' ? 'lecturer' : id === 'roleAdminBtn' ? 'admin' : 'student';
    btn.classList.toggle('active', btnRole === role);
    btn.setAttribute('aria-pressed', (btnRole === role).toString());
  });
  const label = document.getElementById('loginIdLabel');
  const input = document.getElementById('loginId');
  label.textContent = 'Email';
  input.placeholder = 'e.g. ahmad.hafiz@president.ac.id';
  clearLoginError();
}

document.querySelectorAll('.demo-hint-fill').forEach(btn => {
  btn.addEventListener('click', () => {
    setRole(btn.dataset.role);
    document.getElementById('loginId').value = btn.dataset.email || btn.dataset.id;
    document.getElementById('loginPw').value = btn.dataset.pw;
    clearLoginError();
    document.getElementById('loginBtn').focus();
  });
});

document.getElementById('pwToggle').addEventListener('click', () => {
  const input = document.getElementById('loginPw');
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  document.getElementById('pwToggle').setAttribute('aria-pressed', isHidden);
  document.getElementById('eyeIcon').innerHTML = isHidden
    ? '<path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.3"/><line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>'
    : '<ellipse cx="8" cy="8" rx="6" ry="4" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="1.5" stroke="currentColor" stroke-width="1.3"/>';
});

function showLoginError(msg) {
  const el = document.getElementById('loginError');
  document.getElementById('loginErrorMsg').textContent = msg;
  el.classList.add('visible');
  ['loginId','loginPw'].forEach(id => document.getElementById(id).classList.add('error-state'));
}
function clearLoginError() {
  document.getElementById('loginError').classList.remove('visible');
  ['loginId','loginPw'].forEach(id => document.getElementById(id).classList.remove('error-state'));
}
['loginId','loginPw'].forEach(id => { document.getElementById(id).addEventListener('input', clearLoginError); });

function resetLoginForm() {
  document.getElementById('loginId').value = '';
  document.getElementById('loginPw').value = '';
  document.getElementById('loginPw').type = 'password';
  clearLoginError();
  setRole('lecturer');
}

document.getElementById('loginForm').addEventListener('submit', e => { e.preventDefault(); attemptLogin(); });

function attemptLogin() {
  const emailInput = document.getElementById('loginId').value.trim().toLowerCase();
  const pw = document.getElementById('loginPw').value;
  const remember = document.getElementById('rememberMe').checked;
  const btn = document.getElementById('loginBtn');
  if (!emailInput) { showLoginError('Please enter your email address.'); return; }
  if (!pw)  { showLoginError('Please enter your password.'); return; }
  btn.disabled = true; btn.classList.add('loading'); clearLoginError();
  setTimeout(() => {
    // Cari account berdasarkan email (semua role)
    const allAccounts = Object.values(DEMO_ACCOUNTS);
    const account = allAccounts.find(a => a.email.toLowerCase() === emailInput);

    // Generate expected password dari nama depan email (sebelum titik pertama atau @)
    function getExpectedPw(email) {
      const local = email.split('@')[0]; // e.g. "ahmad.hafiz"
      const firstName = local.split('.')[0]; // e.g. "ahmad"
      // For "admin" there's no dot, so firstName === "admin" → "admin123"
      return firstName + '123';
    }

    const expectedPw = account ? getExpectedPw(account.email) : '';

    if (account && (pw === account.password || pw === expectedPw)) {
      const sessionData = { role: account.role, id: account.id, name: account.name, fullName: account.fullName, dept: account.dept, initials: account.initials, email: account.email, loginTime: Date.now(), remember };
      if (remember) saveSession(sessionData);
      else sessionStorage.setItem(KEYS.session, JSON.stringify(sessionData));
      btn.disabled = false; btn.classList.remove('loading');
      applySession(sessionData);
      withSkeleton(() => showView(account.role), 'Signing you in…', 900);
      showToast(`✓ Welcome back, ${account.name}!`);
    } else {
      btn.disabled = false; btn.classList.remove('loading');
      showLoginError('Email atau password salah. Pastikan format password: [nama depan]123');
      showToast('Login failed — check your credentials.', 'error');
    }
  }, 1000);
}

document.getElementById('forgotBtn').addEventListener('click', () => { document.getElementById('forgotBackdrop').classList.add('active'); document.getElementById('forgotOk').focus(); });
document.getElementById('forgotCancel').addEventListener('click', () => document.getElementById('forgotBackdrop').classList.remove('active'));
document.getElementById('forgotOk').addEventListener('click', () => document.getElementById('forgotBackdrop').classList.remove('active'));
document.getElementById('forgotBackdrop').addEventListener('click', e => { if (e.target === document.getElementById('forgotBackdrop')) document.getElementById('forgotBackdrop').classList.remove('active'); });

// ===================================================
//  LOGOUT
// ===================================================
function doLogout() {
  if (stuRefreshInterval) { clearInterval(stuRefreshInterval); stuRefreshInterval = null; }
  clearSession();
  showToast('You have been logged out.', 'warning');
  withSkeleton(showLoginPage, 'Logging out…', 600);
}
document.getElementById('lecLogoutBtn').addEventListener('click', doLogout);
document.getElementById('adminLogoutBtn').addEventListener('click', doLogout);
document.getElementById('stuLogoutBtn').addEventListener('click', doLogout);

// ===================================================
//  DATE & CLOCK
// ===================================================
let clockRunning = false;
function initLiveClock() {
  if (clockRunning) return;
  clockRunning = true;
  function tick() {
    const el = document.getElementById('liveClock');
    if (el) el.textContent = new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }
  tick();
  setInterval(tick, 1000);
}

function initDateStrings() {
  const now = new Date();
  const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
  const el1 = document.getElementById('todayDateStr');
  const el2 = document.getElementById('adminDateStr');
  if (el1) el1.textContent = now.toLocaleDateString('en-MY', opts) + ' · Faculty of Engineering';
  if (el2) el2.textContent = now.toLocaleDateString('en-MY', opts) + ' · All Departments';
}

// ===================================================
//  LECTURER: STATE
// ===================================================
function getLecturerState() {
  return ls_get(KEYS.lecState, { status: 'out', checkInTime: null, checkOutTime: null, todayHistory: [] });
}
function saveLecturerState(state) { ls_set(KEYS.lecState, state); }

// Helper: cek apakah sekarang sedang dalam waktu mengajar
function getTodayClassWindow() {
  const now = new Date();
  const dayIdx = now.getDay();
  const todaySlots = LEC_TIMETABLE.filter(s => s.day === dayIdx);
  if (!todaySlots.length) return null;

  const nowMins = now.getHours() * 60 + now.getMinutes();
  const toMins = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };

  // Cari slot yang paling dekat / sedang berlangsung
  for (const slot of todaySlots) {
    const start = toMins(slot.time);
    const end   = toMins(slot.endTime);
    if (nowMins >= start && nowMins <= end) {
      return { active: true, slot, startMins: start, endMins: end, nowMins };
    }
  }

  // Belum mulai atau sudah selesai semua — cari slot berikutnya
  const upcoming = todaySlots.filter(s => toMins(s.time) > nowMins);
  if (upcoming.length) {
    const next = upcoming.sort((a,b) => toMins(a.time)-toMins(b.time))[0];
    return { active: false, upcoming: next, startMins: toMins(next.time), endMins: toMins(next.endTime), nowMins };
  }

  // Semua kelas sudah selesai hari ini
  return { active: false, allDone: true };
}

function renderLecturerStatus() {
  const s = getLecturerState();
  const card = document.getElementById('statusCard');
  const badge = document.getElementById('statusBadge');
  const dot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const lastAction = document.getElementById('lastAction');
  const checkInBtn = document.getElementById('checkInBtn');
  const checkOutBtn = document.getElementById('checkOutBtn');
  const detailIn = document.getElementById('detailCheckIn');
  const detailOut = document.getElementById('detailCheckOut');

  card.classList.remove('checked-in','checked-out');

  // --- Cek jadwal hari ini ---
  const win = getTodayClassWindow();
  const toMins = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  if (s.status === 'in') {
    card.classList.add('checked-in'); badge.className = 'status-badge in';
    dot.classList.add('pulse'); statusText.textContent = 'Checked In';
    lastAction.innerHTML = `Checked in at <span>${s.checkInTime}</span>`;
    checkInBtn.disabled = true;
    checkInBtn.title = 'Sudah check in';

    // Check out hanya bisa setelah waktu mengajar selesai
    if (win && win.active) {
      checkOutBtn.disabled = true;
      checkOutBtn.title = `Tidak bisa check out — kelas masih berlangsung sampai ${win.slot.endTime}`;
    } else {
      checkOutBtn.disabled = false;
      checkOutBtn.title = '';
    }
    detailIn.textContent = s.checkInTime || '—'; detailOut.textContent = '—';

  } else if (s.status === 'done') {
    card.classList.add('checked-out'); badge.className = 'status-badge done';
    dot.classList.remove('pulse'); statusText.textContent = 'Checked Out';
    lastAction.innerHTML = `Checked out at <span>${s.checkOutTime}</span>`;
    checkInBtn.disabled = true; checkOutBtn.disabled = true;
    checkInBtn.title = 'Sudah check out hari ini';
    checkOutBtn.title = 'Sudah check out hari ini';
    detailIn.textContent = s.checkInTime || '—'; detailOut.textContent = s.checkOutTime || '—';

  } else {
    // Belum check in
    badge.className = 'status-badge out'; dot.classList.remove('pulse');
    statusText.textContent = 'Not Checked In';
    lastAction.innerHTML = `Last action: <span>Yesterday at 5:02 PM</span>`;
    checkOutBtn.disabled = true;
    checkOutBtn.title = 'Harus check in terlebih dahulu';
    detailIn.textContent = '—'; detailOut.textContent = '—';

    // Check in hanya bisa saat sudah masuk waktu mengajar
    if (!win) {
      checkInBtn.disabled = true;
      checkInBtn.title = 'Tidak ada jadwal mengajar hari ini';
    } else if (win.allDone) {
      checkInBtn.disabled = true;
      checkInBtn.title = 'Waktu mengajar hari ini sudah selesai';
    } else if (win.active) {
      // Sedang dalam jam kelas — boleh check in
      checkInBtn.disabled = false;
      checkInBtn.title = '';
    } else if (win.upcoming) {
      // Kelas belum mulai — tidak boleh check in dulu
      checkInBtn.disabled = true;
      checkInBtn.title = `Belum waktunya — kelas mulai pukul ${win.upcoming.time}`;
    } else {
      checkInBtn.disabled = false;
      checkInBtn.title = '';
    }
  }
}

// ===================================================
//  CHECK-IN VALIDATION
// ===================================================
function showCheckinValidation(callback) {
  const settings = getSettings();
  const mode = settings.validationMode;
  if (mode === 'none') { callback(true); return; }

  const backdrop = document.getElementById('checkinValidateBackdrop');
  const body = document.getElementById('checkinValidateBody');
  backdrop.classList.add('active');

  if (mode === 'qr') {
    body.innerHTML = `
      <div class="validate-mode-card">
        <svg viewBox="0 0 48 48" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="2"/><rect x="7" y="7" width="10" height="10" fill="currentColor"/><rect x="28" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="2"/><rect x="31" y="7" width="10" height="10" fill="currentColor"/><rect x="4" y="28" width="16" height="16" rx="2" stroke="currentColor" stroke-width="2"/><rect x="7" y="31" width="10" height="10" fill="currentColor"/><rect x="28" y="28" width="5" height="5" fill="currentColor"/><rect x="36" y="28" width="8" height="8" fill="currentColor"/><rect x="28" y="38" width="16" height="6" fill="currentColor"/></svg>
        <h4>QR Code Check-In</h4>
        <p>Enter the QR code displayed in your classroom to verify your presence.</p>
      </div>
      <div class="login-field">
        <label for="qrInput">QR Code</label>
        <input type="text" id="qrInput" class="login-input" placeholder="Enter QR code..." style="padding-left:14px;font-family:'DM Mono',monospace;" autocomplete="off">
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;">
        <button class="export-btn" onclick="closeCheckinValidation()">Cancel</button>
        <button class="login-btn" style="width:auto;padding:10px 20px;" onclick="validateQR()">Validate & Check In</button>
      </div>
      <div style="margin-top:10px;padding:8px 12px;background:var(--blue-light);border-radius:6px;font-size:12px;color:var(--blue);">
        Demo: Enter <strong>${settings.qrCode}</strong>
      </div>`;
    setTimeout(() => { const inp = document.getElementById('qrInput'); if (inp) inp.focus(); }, 100);
    window._checkinCallback = callback;

  } else if (mode === 'gps') {
    body.innerHTML = `
      <div class="validate-mode-card">
        <svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="22" r="8" stroke="currentColor" stroke-width="2"/><path d="M24 4v4M24 40v4M4 24h4M40 24h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="24" cy="22" r="2" fill="currentColor"/></svg>
        <h4>GPS Location Check-In</h4>
        <p>Your location will be verified against the campus coordinates to confirm you're on-site.</p>
        <button class="login-btn" style="width:auto;padding:10px 20px;margin-top:8px;" onclick="validateGPS()">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="margin-right:6px;"><circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
          Get My Location
        </button>
      </div>
      <div id="gpsStatus" style="font-size:13px;color:var(--text-muted);text-align:center;margin-top:8px;"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
        <button class="export-btn" onclick="closeCheckinValidation()">Cancel</button>
      </div>`;
    window._checkinCallback = callback;
  }
}

function closeCheckinValidation() {
  document.getElementById('checkinValidateBackdrop').classList.remove('active');
  window._checkinCallback = null;
}

function validateQR() {
  const settings = getSettings();
  const input = document.getElementById('qrInput').value.trim();
  if (input === settings.qrCode) {
    closeCheckinValidation();
    if (window._checkinCallback) window._checkinCallback(true);
  } else {
    showToast('Invalid QR code. Access denied.', 'error');
    document.getElementById('qrInput').classList.add('error-state');
    setTimeout(() => document.getElementById('qrInput').classList.remove('error-state'), 2000);
  }
}

function validateGPS() {
  const settings = getSettings();
  const statusEl = document.getElementById('gpsStatus');
  if (!navigator.geolocation) {
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--danger)">❌ Geolocation is not supported by this browser.</span>';
    showToast('Geolocation not supported in this browser.', 'error');
    return;
  }
  if (statusEl) statusEl.innerHTML = '<span class="gps-locating-text">📡 Acquiring GPS signal…</span>';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      const settings2 = getSettings(); // re-fetch in case it changed
      const maxAcc = settings2.maxGpsAccuracy || 150;
      // Anti fake-GPS: reject if accuracy is worse than threshold
      if (accuracy > maxAcc) {
        if (statusEl) statusEl.innerHTML = `<span style="color:var(--warning)">⚠️ GPS signal too weak (accuracy: ${Math.round(accuracy)}m). Move to an open area and try again.</span>`;
        showToast(`GPS accuracy too low (${Math.round(accuracy)}m). Try outdoors.`, 'error');
        return;
      }
      const dist = getDistanceMeters(latitude, longitude, settings2.campusLat, settings2.campusLng);
      const distRound = Math.round(dist);
      const allowed = settings2.campusRadius;
      if (dist <= allowed) {
        if (statusEl) statusEl.innerHTML = `<span style="color:var(--success)">✅ Location verified — ${distRound}m from campus (within ${allowed}m radius)</span>`;
        showToast(`✓ Location verified (${distRound}m from campus)`, 'success');
        closeCheckinValidation();
        if (window._checkinCallback) window._checkinCallback(true, latitude, longitude, distRound);
      } else {
        if (statusEl) statusEl.innerHTML = `<span style="color:var(--danger)">❌ Too far from campus — ${distRound}m away (limit: ${allowed}m). Please be on campus to check in.</span>`;
        showToast(`Check-in denied — you are ${distRound}m from campus (limit: ${allowed}m).`, 'error');
      }
    },
    (err) => {
      let msg = 'Location access failed.';
      if (err.code === 1) msg = '🚫 Location permission denied. Please allow location access in your browser settings.';
      else if (err.code === 2) msg = '📡 GPS signal unavailable. Try moving outdoors.';
      else if (err.code === 3) msg = '⏱ GPS request timed out. Please try again.';
      if (statusEl) statusEl.innerHTML = `<span style="color:var(--danger)">${msg}</span>`;
      showToast(msg, 'error');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ===================================================
//  GPS AUTO CHECK-IN (dedicated GPS panel function)
// ===================================================
let _gpsWatchId = null;
let _gpsAutoCheckinIntervalId = null;

function initGPSPanel() {
  // Update radius display in footer
  const settings = getSettings();
  const radiusEl = document.getElementById('gpsPanelRadius');
  if (radiusEl) radiusEl.textContent = settings.campusRadius + 'm';

  // Restore background tracking toggle state
  const isAutoTrackingOn = ls_get('autoTrackingEnabled', false);
  const toggleBtn = document.getElementById('lecturerAutoTrackingToggle');
  if (toggleBtn) {
    toggleBtn.classList.toggle('on', isAutoTrackingOn);
    toggleBtn.setAttribute('aria-pressed', isAutoTrackingOn.toString());
  }

  // Start periodic tracking if enabled
  if (isAutoTrackingOn && !_gpsAutoCheckinIntervalId) {
    _gpsAutoCheckinIntervalId = setInterval(() => {
      const currentHour = new Date().getHours();
      if (currentHour >= 6 && currentHour < 20) {
        gpsAutoCheckin();
      }
    }, 900000); // 15 mins
  }

  // Restore GPS panel state based on current check-in status
  const s = getLecturerState();
  if (s.status === 'in') {
    updateGPSPanel({ state: 'already-in', msg: `Already checked in at ${s.checkInTime}` });
  } else if (s.status === 'done') {
    updateGPSPanel({ state: 'already-in', msg: `Attendance complete — checked out at ${s.checkOutTime}` });
  } else {
    updateGPSPanel({ state: 'idle' });
  }
}

// toggleLecturerAutoTracking removed because it is handled by the global .toggle listener

function gpsAutoCheckin() {
  const session = getSession();
  if (!session || session.role !== 'lecturer') return;

  const s = getLecturerState();
  // Duplicate check — already checked in today
  if (s.status === 'in' || s.status === 'done') {
    const msg = s.status === 'in' ? `Already checked in at ${s.checkInTime}` : `Already completed attendance today (checked out at ${s.checkOutTime})`;
    showToast(msg, 'warning');
    updateGPSPanel({ state: 'already-in', msg });
    return;
  }

  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by this browser.', 'error');
    updateGPSPanel({ state: 'error', msg: 'Geolocation not supported.' });
    return;
  }

  updateGPSPanel({ state: 'locating' });

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      const settings = getSettings();
      const maxAcc = settings.maxGpsAccuracy || 150;

      // Anti fake-GPS accuracy check
      if (accuracy > maxAcc) {
        updateGPSPanel({ state: 'weak', accuracy: Math.round(accuracy) });
        showToast(`GPS signal too weak (accuracy ±${Math.round(accuracy)}m). Try outdoors.`, 'error');
        return;
      }

      const dist = getDistanceMeters(latitude, longitude, settings.campusLat, settings.campusLng);
      const distRound = Math.round(dist);
      const allowed = settings.campusRadius;

      updateGPSPanel({ state: dist <= allowed ? 'on-campus' : 'off-campus', dist: distRound, allowed, accuracy: Math.round(accuracy), lat: latitude, lng: longitude });

      if (dist <= allowed) {
        // ✅ Within radius — perform auto check-in
        performGPSCheckin(latitude, longitude, distRound);
        // Start GPS watch for auto check-out (if enabled)
        if (settings.autoCheckout) startGPSWatch();
      } else {
        showToast(`Check-in denied — ${distRound}m from campus (limit: ${allowed}m).`, 'error');
      }
    },
    (err) => {
      let msg = 'Location access failed.';
      if (err.code === 1) msg = 'Location permission denied. Allow access in browser settings.';
      else if (err.code === 2) msg = 'GPS signal unavailable. Try moving outdoors.';
      else if (err.code === 3) msg = 'GPS request timed out. Try again.';
      updateGPSPanel({ state: 'error', msg });
      showToast(msg, 'error');
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
}

function performGPSCheckin(lat, lng, distRound) {
  const session = getSession();
  const now = new Date();
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const today = now.toISOString().split('T')[0];

  const s = getLecturerState();
  s.status = 'in'; s.checkInTime = time; s.checkInDate = today;
  saveLecturerState(s);

  const records = getRecords();
  const status = isLate(time) ? 'Late' : 'Present';
  const existing = records.findIndex(r => r.id === session.id && r.date === today);
  const recEntry = { name: session.fullName, id: session.id, dept: session.dept, date: today, checkIn: time, checkOut: '', duration: '', status, reason: '', gpsLat: lat, gpsLng: lng, gpsDistance: distRound };
  if (existing >= 0) {
    records[existing] = { ...records[existing], checkIn: time, status, gpsLat: lat, gpsLng: lng, gpsDistance: distRound };
  } else {
    records.unshift(recEntry);
  }
  ls_set(KEYS.attendanceRecs, records);
  addAuditLog('gps-checkin', session.name, `GPS auto check-in at ${time} — ${distRound}m from campus — Status: ${status}`, 'check-in');

  renderLecturerStatus();
  renderQuickHistory();
  renderLecturerQuickStats();
  applyAdminFilters();
  renderActivityFeed();
  updateGPSPanel({ state: 'checked-in', time, dist: distRound, status });
  showToast(`✅ GPS Check-In successful at ${time}${isLate(time) ? ' (Late)' : ''} — ${distRound}m from campus`);
}

function updateGPSPanel(opts) {
  const panel = document.getElementById('gpsPanelStatus');
  const distBadge = document.getElementById('gpsPanelDist');
  const btn = document.getElementById('gpsAutoCheckinBtn');
  if (!panel) return;

  const states = {
    idle:       { dot: '', text: 'Press the button to check your location', color: 'var(--text-muted)', btnText: '📍 Auto Check-In via GPS', btnDisabled: false },
    locating:   { dot: 'gps-dot-pulse', text: '📡 Acquiring GPS signal…', color: 'var(--blue)', btnText: '⏳ Locating…', btnDisabled: true },
    'on-campus':{ dot: 'gps-dot-green', text: `✅ On campus — ${opts.dist}m away (±${opts.accuracy}m accuracy)`, color: 'var(--success)', btnText: '📍 Auto Check-In via GPS', btnDisabled: false },
    'off-campus':{ dot: 'gps-dot-red', text: `❌ Off campus — ${opts.dist}m away (limit: ${opts.allowed}m)`, color: 'var(--danger)', btnText: '📍 Auto Check-In via GPS', btnDisabled: false },
    'checked-in':{ dot: 'gps-dot-green', text: `✅ Checked in via GPS at ${opts.time} — ${opts.dist}m from campus`, color: 'var(--success)', btnText: '✓ Checked In', btnDisabled: true },
    'already-in':{ dot: 'gps-dot-green', text: opts.msg, color: 'var(--success)', btnText: '✓ Already Checked In', btnDisabled: true },
    weak:       { dot: 'gps-dot-yellow', text: `⚠️ GPS too weak (±${opts.accuracy}m). Move outdoors.`, color: 'var(--warning)', btnText: '📍 Retry GPS Check-In', btnDisabled: false },
    error:      { dot: 'gps-dot-red', text: opts.msg || 'Location error.', color: 'var(--danger)', btnText: '📍 Retry GPS Check-In', btnDisabled: false },
  };
  const st = states[opts.state] || states.idle;
  panel.innerHTML = `<span class="gps-status-dot ${st.dot}"></span><span style="color:${st.color};font-size:13px;">${st.text}</span>`;
  if (btn) { btn.textContent = st.btnText; btn.disabled = st.btnDisabled; }
  if (distBadge && opts.dist != null) {
    distBadge.textContent = `${opts.dist}m from campus`;
    distBadge.style.display = 'inline-flex';
    distBadge.style.color = opts.dist <= (opts.allowed || getSettings().campusRadius) ? 'var(--success)' : 'var(--danger)';
  } else if (distBadge) {
    distBadge.style.display = 'none';
  }
}

// ===================================================
//  GPS WATCH (auto check-out when leaving campus)
// ===================================================
function startGPSWatch() {
  stopGPSWatch(); // clear any existing watch
  const settings = getSettings();
  if (!navigator.geolocation) return;
  _gpsWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const s = getLecturerState();
      if (s.status !== 'in') { stopGPSWatch(); return; } // already checked out
      const dist = getDistanceMeters(latitude, longitude, settings.campusLat, settings.campusLng);
      // If moved more than (radius + 50m buffer) away — trigger auto check-out
      if (dist > settings.campusRadius + 50) {
        stopGPSWatch();
        triggerAutoCheckout(Math.round(dist));
      }
    },
    (err) => { stopGPSWatch(); },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
  );
}

function stopGPSWatch() {
  if (_gpsWatchId !== null) {
    navigator.geolocation.clearWatch(_gpsWatchId);
    _gpsWatchId = null;
  }
}

function triggerAutoCheckout(distMeters) {
  const session = getSession();
  const s = getLecturerState();
  if (!session || s.status !== 'in') return;
  const now = new Date();
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const duration = calcDuration(s.checkInTime, time);
  const entry = { date: s.checkInDate || now.toISOString().split('T')[0], checkIn: s.checkInTime, checkOut: time, duration, status: isLate(s.checkInTime) ? 'Late' : 'Present' };
  if (!s.todayHistory) s.todayHistory = [];
  s.todayHistory.unshift(entry);
  s.status = 'done'; s.checkOutTime = time;
  saveLecturerState(s);
  const records = getRecords();
  const idx = records.findIndex(r => r.id === session.id && r.date === entry.date);
  if (idx >= 0) { records[idx].checkOut = time; records[idx].duration = duration; records[idx].status = entry.status; }
  else records.unshift({ name: session.fullName, id: session.id, dept: session.dept, date: entry.date, checkIn: s.checkInTime, checkOut: time, duration, status: entry.status, reason: '', gpsAutoCheckout: true });
  ls_set(KEYS.attendanceRecs, records);
  addAuditLog('gps-checkout', session.name, `GPS auto check-out at ${time} — left campus (~${distMeters}m away) — Duration: ${duration}`, 'check-out');
  renderLecturerStatus(); renderQuickHistory(); renderLecturerQuickStats();
  applyAdminFilters(); renderActivityFeed();
  updateGPSPanel({ state: 'idle' });
  showToast(`📍 Auto check-out at ${time} — left campus (${distMeters}m). Duration: ${duration}`, 'warning');
}

document.getElementById('checkinValidateClose').addEventListener('click', closeCheckinValidation);
document.getElementById('checkinValidateBackdrop').addEventListener('click', e => {
  if (e.target === document.getElementById('checkinValidateBackdrop')) closeCheckinValidation();
});

// ===================================================
//  LECTURER: CHECK-IN / CHECK-OUT
// ===================================================
document.getElementById('checkInBtn').addEventListener('click', () => {
  const s = getLecturerState();
  if (s.status === 'in') { showToast('Already checked in!', 'error'); return; }
  showCheckinValidation((valid, gpsLat, gpsLng, gpsDist) => {
    if (!valid) return;
    const now = new Date();
    const time = now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    const today = now.toISOString().split('T')[0];
    s.status = 'in'; s.checkInTime = time; s.checkInDate = today;
    saveLecturerState(s);
    const session = getSession();
    const records = getRecords();
    const existing = records.findIndex(r => r.id === session.id && r.date === today);
    const status = isLate(time) ? 'Late' : 'Present';
    const gpsFields = gpsLat != null ? { gpsLat, gpsLng, gpsDistance: gpsDist } : {};
    if (existing >= 0) {
      records[existing] = { ...records[existing], checkIn: time, status, ...gpsFields };
    } else {
      records.unshift({ name: session.fullName, id: session.id, dept: session.dept, date: today, checkIn: time, checkOut: '', duration: '', status, reason: '', ...gpsFields });
    }
    ls_set(KEYS.attendanceRecs, records);
    addAuditLog('check-in', session.name, `Checked in at ${time} — Status: ${status}${gpsDist != null ? ` — GPS: ${gpsDist}m from campus` : ''}`, 'check-in');
    renderLecturerStatus(); renderQuickHistory(); renderLecturerQuickStats();
    applyAdminFilters(); renderActivityFeed();
    showToast(`✓ Checked in at ${time}${isLate(time) ? ' (Late)' : ''}`);
  });
});

document.getElementById('checkOutBtn').addEventListener('click', () => {
  const s = getLecturerState();
  if (s.status !== 'in') { showToast('You must check in first!', 'error'); return; }
  const now = new Date();
  const time = now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
  const duration = calcDuration(s.checkInTime, time);
  const entry = { date: s.checkInDate || now.toISOString().split('T')[0], checkIn: s.checkInTime, checkOut: time, duration, status: isLate(s.checkInTime) ? 'Late' : 'Present' };
  if (!s.todayHistory) s.todayHistory = [];
  s.todayHistory.unshift(entry);
  s.status = 'done'; s.checkOutTime = time;
  saveLecturerState(s);
  // Update record — SELALU simpan, jangan hanya jika idx >= 0
  const session = getSession();
  const records = getRecords();
  const idx = records.findIndex(r => r.id === session.id && r.date === entry.date);
  if (idx >= 0) { 
    records[idx].checkOut = time; 
    records[idx].duration = duration; 
    records[idx].status = entry.status;
  } else {
    // Jika record tidak ditemukan, buat baru
    records.unshift({ name: session.fullName, id: session.id, dept: session.dept, date: entry.date, checkIn: s.checkInTime, checkOut: time, duration, status: entry.status, reason: '' });
  }
  ls_set(KEYS.attendanceRecs, records);
  addAuditLog('check-out', session.name, `Checked out at ${time} — Duration: ${duration}`, 'check-out');
  renderLecturerStatus(); renderQuickHistory(); renderLecturerQuickStats();
  applyAdminFilters(); renderActivityFeed();
  showToast(`✓ Checked out at ${time} · Duration: ${duration}`);
});

// ===================================================
//  LECTURER: TODAY'S SCHEDULE
// ===================================================
function renderLecToday() {
  const now = new Date();
  const dayIdx = now.getDay();
  const todaySlots = LEC_TIMETABLE.filter(s => s.day === dayIdx);
  const container = document.getElementById('lecTodaySchedule');
  const countEl = document.getElementById('lecTodayScheduleCount');
  if (countEl) countEl.textContent = todaySlots.length + ' classes today';
  if (!container) return;
  if (!todaySlots.length) {
    container.innerHTML = `<div class="empty-state visible"><div class="empty-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div><h4>No classes today</h4><p>Enjoy your free day!</p></div>`;
    return;
  }
  container.innerHTML = todaySlots.map(slot => {
    const subj = LEC_SUBJECTS.find(s => s.code === slot.code) || { name: slot.code };
    return `<div class="lec-schedule-slot">
      <div class="lec-slot-time">${slot.time}–${slot.endTime}</div>
      <div class="lec-slot-detail">
        <div class="lec-slot-name">${escHtml(subj.name)}</div>
        <div class="lec-slot-meta">${escHtml(slot.code)} · ${escHtml(slot.room)}</div>
      </div>
    </div>`;
  }).join('');
}

// ===================================================
//  LECTURER: LEAVE REQUESTS
// ===================================================
document.getElementById('leaveRequestBtn')?.addEventListener('click', openLeaveModal);
document.getElementById('newLeaveBtn')?.addEventListener('click', openLeaveModal);

// Close button handlers
document.getElementById('leaveModalClose').addEventListener('click', e => {
  e.preventDefault();
  e.stopPropagation();
  closeLeaveModal();
});
document.getElementById('leaveModalCancelBtn').addEventListener('click', e => {
  e.preventDefault();
  e.stopPropagation();
  closeLeaveModal();
});

// Backdrop click handler
document.getElementById('leaveModalBackdrop').addEventListener('click', e => {
  e.stopPropagation();
  if (e.target === document.getElementById('leaveModalBackdrop')) {
    closeLeaveModal();
  }
});

// Show/hide reschedule fields when type changes
document.querySelectorAll('input[name="leaveType"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const rescFields = document.getElementById('rescheduleFields');
    if (rescFields) rescFields.style.display = radio.value === 'Reschedule' ? 'block' : 'none';
  });
});

function openLeaveModal() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('leaveDate').value = today;
  document.getElementById('leaveModalBackdrop').classList.add('active');
}
function closeLeaveModal() {
  const backdrop = document.getElementById('leaveModalBackdrop');
  const form = document.getElementById('leaveForm');
  const rescFields = document.getElementById('rescheduleFields');
  
  if (backdrop) {
    backdrop.classList.remove('active');
    backdrop.style.pointerEvents = 'none';
  }
  if (form) form.reset();
  if (rescFields) rescFields.style.display = 'none';
}

function populateLeaveClassDropdown(lecId) {
  const select = document.getElementById('leaveClass');
  if (!select) return;
  select.innerHTML = '<option value="">Select class...</option>';
  LEC_TIMETABLE.forEach(slot => {
    const subj = LEC_SUBJECTS.find(s => s.code === slot.code) || { name: slot.code };
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const opt = document.createElement('option');
    opt.value = slot.code;
    opt.textContent = `${subj.name} (${days[slot.day]}, ${slot.time})`;
    select.appendChild(opt);
  });
}

document.getElementById('leaveForm').addEventListener('submit', e => {
  e.preventDefault();
  e.stopPropagation();
  
  const session = getSession();
  if (!session) { 
    showToast('Session expired. Please login again.', 'error'); 
    closeLeaveModal();
    return; 
  }
  
  const typeEl = document.querySelector('input[name="leaveType"]:checked');
  const type = typeEl ? typeEl.value : 'Late';
  const classCode = document.getElementById('leaveClass').value;
  const date = document.getElementById('leaveDate').value;
  const reason = document.getElementById('leaveReason').value.trim();
  const proofFile = document.getElementById('leaveProof').files[0];

  // Validation with proper error handling
  if (!classCode) { 
    showToast('Please select a class.', 'error'); 
    return; 
  }
  if (!date) { 
    showToast('Please select a date.', 'error'); 
    return; 
  }
  if (!reason) { 
    showToast('Please provide a reason.', 'error'); 
    return; 
  }

  const handleProof = (proofData) => {
    try {
      const requests = getLeaveRequests();
      const req = {
        id: Date.now(),
        lecturerId: session.id,
        lecturerName: session.name,
        dept: session.dept,
        type,
        classCode,
        date,
        reason,
        proof: proofData || null,
        status: 'Pending',
        adminNote: '',
        submittedAt: new Date().toISOString(),
        newDate: document.getElementById('newDate')?.value || '',
        newTime: document.getElementById('newTime')?.value || '',
        newRoom: document.getElementById('newRoom')?.value || '',
      };
      requests.unshift(req);
      ls_set(KEYS.leaveRequests, requests);
      addAuditLog('leave-request', session.name, `Submitted ${type} request for ${classCode} on ${date}: "${reason}"`, 'leave-request');
      broadcastLeaveNotification(req);
      
      closeLeaveModal();
      renderPendingLeaveAlert();
      renderMyLeaveRequests();
      showToast(`✓ ${type} request submitted — Pending admin approval`);
    } catch (err) {
      console.error('Leave request error:', err);
      showToast('Error submitting request. Please try again.', 'error');
      closeLeaveModal();
    }
  };

  if (proofFile) {
    try {
      const reader = new FileReader();
      reader.onload = (ev) => handleProof(ev.target.result);
      reader.onerror = () => {
        showToast('Error reading file. Please try again.', 'error');
        closeLeaveModal();
      };
      reader.readAsDataURL(proofFile);
    } catch (err) {
      console.error('File reading error:', err);
      showToast('Error processing file.', 'error');
      closeLeaveModal();
    }
  } else {
    handleProof(null);
  }
});

function renderPendingLeaveAlert() {
  const session = getSession();
  if (!session) return;
  const requests = getLeaveRequests().filter(r => r.lecturerId === session.id && r.status === 'Pending');
  const el = document.getElementById('pendingLeaveAlert');
  if (!el) return;
  if (requests.length) {
    el.style.display = 'flex';
    el.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><span>You have ${requests.length} pending leave request${requests.length > 1 ? 's' : ''} awaiting admin approval.</span>`;
  } else { el.style.display = 'none'; }
}

function renderMyLeaveRequests() {
  const session = getSession();
  if (!session) return;
  const all = getLeaveRequests().filter(r => r.lecturerId === session.id);
  const container = document.getElementById('myLeaveRequests');
  const countEl = document.getElementById('leaveRequestCount');
  if (countEl) countEl.textContent = all.length + ' requests';
  if (!container) return;
  if (!all.length) {
    container.innerHTML = `<div class="empty-state visible"><div class="empty-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div><h4>No requests yet</h4><p>Submit a leave or delay request using the button above.</p></div>`;
    return;
  }
  const icons = { Late: '🕐', Absent: '❌', Online: '💻', Reschedule: '📅' };
  const statusCls = { Pending: 'warning', Approved: 'present', Rejected: 'absent' };
  container.innerHTML = all.map(req => `
    <div class="my-leave-item">
      <div class="my-leave-type-icon">${icons[req.type] || '📋'}</div>
      <div class="my-leave-detail">
        <div class="my-leave-title">${escHtml(req.type)} — ${escHtml(req.classCode)}</div>
        <div class="my-leave-meta">${fmtDate(req.date)} · ${escHtml(req.reason).substring(0,60)}${req.reason.length>60?'…':''}</div>
        ${req.adminNote ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Admin note: ${escHtml(req.adminNote)}</div>` : ''}
        <div style="font-size:11px;color:var(--text-faint);margin-top:2px;">${formatTimeAgo(req.submittedAt)}</div>
      </div>
      <div class="my-leave-status">${chipHtml(req.status)}</div>
    </div>`).join('');
}

// ===================================================
//  LECTURER: TABS
// ===================================================
function switchLecturerTab(tab) {
  document.querySelectorAll('#lecturerView .nav-link').forEach(l => l.classList.toggle('active', l.dataset.tab === tab));
  document.querySelectorAll('.lec-page').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab));
  if (tab === 'history') renderFullHistory();
  if (tab === 'profile') renderProfile();
  if (tab === 'leave') renderMyLeaveRequests();
}

document.querySelectorAll('#lecturerView .nav-link[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => switchLecturerTab(btn.dataset.tab));
});
document.getElementById('viewAllBtn').addEventListener('click', () => switchLecturerTab('history'));

// ===================================================
//  LECTURER: HISTORY
// ===================================================
const LEC_HISTORY_SEED = [
  { date:'2025-04-04', checkIn:'08:03', checkOut:'17:02', duration:'8h 59m', status:'Present' },
  { date:'2025-04-03', checkIn:'08:47', checkOut:'16:50', duration:'8h 03m', status:'Late' },
  { date:'2025-04-02', checkIn:'07:58', checkOut:'17:05', duration:'9h 07m', status:'Present' },
  { date:'2025-04-01', checkIn:'08:01', checkOut:'17:00', duration:'8h 59m', status:'Present' },
  { date:'2025-03-31', checkIn:'', checkOut:'', duration:'', status:'Absent' },
  { date:'2025-03-28', checkIn:'07:55', checkOut:'17:10', duration:'9h 15m', status:'Present' },
  { date:'2025-03-27', checkIn:'08:10', checkOut:'16:55', duration:'8h 45m', status:'Present' },
  { date:'2025-03-26', checkIn:'09:05', checkOut:'17:00', duration:'7h 55m', status:'Late' },
  { date:'2025-03-25', checkIn:'07:50', checkOut:'17:15', duration:'9h 25m', status:'Present' },
  { date:'2025-03-24', checkIn:'', checkOut:'', duration:'', status:'Absent' },
];

function getFullHistory() {
  const s = getLecturerState();
  return [...(s.todayHistory || []), ...LEC_HISTORY_SEED];
}

function renderHistoryRow(entry) {
  const d = new Date((entry.date || '2025-01-01') + 'T00:00:00');
  return `<tr>
    <td class="mono">${d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</td>
    <td>${d.toLocaleDateString('en-GB',{weekday:'long'})}</td>
    <td class="mono">${entry.checkIn || '—'}</td>
    <td class="mono">${entry.checkOut || '—'}</td>
    <td class="mono">${entry.duration || '—'}</td>
    <td>${chipHtml(entry.status)}</td>
  </tr>`;
}

function renderQuickHistory() {
  document.getElementById('quickHistoryBody').innerHTML = getFullHistory().slice(0, 5).map(renderHistoryRow).join('');
}
function renderFullHistory() {
  const session = getSession();
  if (!session) return;
  
  const all = getFullHistory();
  const el = document.getElementById('fullHistoryBody');
  const empty = document.getElementById('historyEmpty');
  document.getElementById('historyRecordCount').textContent = `${all.length} records`;
  
  if (!all.length) { 
    el.innerHTML = ''; 
    empty.classList.add('visible'); 
    return; 
  }
  
  empty.classList.remove('visible');
  el.innerHTML = all.map(renderHistoryRow).join('');
}
function renderProfile() {
  const all = getFullHistory();
  document.getElementById('profilePresent').textContent = all.filter(r=>r.status==='Present').length;
  document.getElementById('profileLate').textContent = all.filter(r=>r.status==='Late').length;
  document.getElementById('profileAbsent').textContent = all.filter(r=>r.status==='Absent').length;
}

// ===================================================
//  LECTURER: QUICK STATS
// ===================================================
function renderLecturerQuickStats() {
  const all = getFullHistory();
  const s = getLecturerState();
  const el = document.getElementById('lecDailyClasses');
  const now = new Date();
  if (el) el.textContent = LEC_TIMETABLE.filter(t => t.day === now.getDay()).length;
  const el2 = document.getElementById('lecWorkedHours');
  if (el2) {
    if (s.status === 'done' && s.checkInTime && s.checkOutTime) el2.textContent = calcDuration(s.checkInTime, s.checkOutTime);
    else if (s.status === 'in' && s.checkInTime) el2.textContent = calcDuration(s.checkInTime, now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}));
    else el2.textContent = '—';
  }
  const el3 = document.getElementById('lecAttendRate');
  const present = all.filter(r=>r.status==='Present').length;
  if (el3) el3.textContent = all.length ? Math.round((present/all.length)*100) + '%' : '—';
}

// ===================================================
//  ADMIN: SIDEBAR
// ===================================================
function switchAdminSection(section) {
  withSkeleton(() => {
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.toggle('active', i.dataset.section === section));
    document.querySelectorAll('.admin-section').forEach(s => s.classList.toggle('active', s.id === 'section-' + section));
    if (section === 'records') applyAdminFilters();
    if (section === 'dashboard') { updateDashboard(); renderActivityFeed(); }
    if (section === 'lecturers') renderLecturerGrid();
    if (section === 'export') { renderExportBar(); setDefaultExportFilters(); }
    if (section === 'approvals') renderApprovals();
    if (section === 'auditlog') renderAuditLog();
    if (section === 'settings') loadAdminSettings();
  }, 'Loading section…', 400);
}

document.querySelectorAll('.sidebar-item[data-section]').forEach(btn => {
  btn.addEventListener('click', () => switchAdminSection(btn.dataset.section));
});

// ===================================================
//  ADMIN: FILTERS
// ===================================================
function setDefaultDateFilters() {
  const today = new Date();
  const prior = new Date(today);
  prior.setDate(prior.getDate() - 9);
  document.getElementById('filterDateFrom').value = prior.toISOString().split('T')[0];
  document.getElementById('filterDateTo').value = today.toISOString().split('T')[0];
}

function applyAdminFilters() {
  const from   = document.getElementById('filterDateFrom');
  const to     = document.getElementById('filterDateTo');
  const dept   = document.getElementById('filterDept');
  const status = document.getElementById('filterStatus');
  const search = document.getElementById('filterSearch');
  
  // Get values with fallback to empty string if elements don't exist
  const fromVal   = from ? from.value : '';
  const toVal     = to ? to.value : '';
  const deptVal   = dept ? dept.value : '';
  const statusVal = status ? status.value : '';
  const searchVal = search ? search.value.toLowerCase().trim() : '';
  
  const records = getRecords();
  adminState.filtered = records.filter(r => {
    if (fromVal && r.date < fromVal) return false;
    if (toVal && r.date > toVal) return false;
    if (deptVal && r.dept !== deptVal) return false;
    if (statusVal && r.status !== statusVal) return false;
    if (searchVal && !r.name.toLowerCase().includes(searchVal) && !r.id.toLowerCase().includes(searchVal)) return false;
    return true;
  });
  adminState.page = 1;
  updateFilterKPIs();
  renderAdminTable();
}

function updateFilterKPIs() {
  const f = adminState.filtered;
  const el = id => document.getElementById(id);
  if (el('fKpiPresent')) el('fKpiPresent').textContent = f.filter(r=>r.status==='Present').length;
  if (el('fKpiLate')) el('fKpiLate').textContent    = f.filter(r=>r.status==='Late').length;
  if (el('fKpiAbsent')) el('fKpiAbsent').textContent  = f.filter(r=>r.status==='Absent').length;
  if (el('fKpiTotal')) el('fKpiTotal').textContent   = f.length;
}

['filterDateFrom','filterDateTo','filterDept','filterStatus'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', () => withSkeleton(applyAdminFilters, 'Filtering…', 300));
});
const filterSearch = document.getElementById('filterSearch');
if (filterSearch) {
  filterSearch.addEventListener('input', () => {
    clearTimeout(filterSearch._t);
    filterSearch._t = setTimeout(applyAdminFilters, 250);
  });
}

// ===================================================
//  ADMIN: SORTING
// ===================================================
document.querySelectorAll('th.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    if (adminState.sortCol === col) adminState.sortDir = adminState.sortDir === 'asc' ? 'desc' : 'asc';
    else { adminState.sortCol = col; adminState.sortDir = 'asc'; }
    document.querySelectorAll('th.sortable').forEach(h => h.classList.remove('sort-asc','sort-desc'));
    th.classList.add(adminState.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
    renderAdminTable();
  });
});

function sortFiltered(data) {
  return [...data].sort((a, b) => {
    let va = a[adminState.sortCol === 'name' ? 'name' : adminState.sortCol === 'checkin' ? 'checkIn' : 'status'] || '';
    let vb = b[adminState.sortCol === 'name' ? 'name' : adminState.sortCol === 'checkin' ? 'checkIn' : 'status'] || '';
    if (adminState.sortCol === 'date') { va = a.date; vb = b.date; }
    return adminState.sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });
}

// ===================================================
//  ADMIN: TABLE RENDER
// ===================================================
function renderAdminTable() {
  const sorted = sortFiltered(adminState.filtered);
  const start = (adminState.page - 1) * adminState.perPage;
  const paged = sorted.slice(start, start + adminState.perPage);
  const tbody = document.getElementById('adminTableBody');
  const empty = document.getElementById('adminEmpty');
  const info = document.getElementById('paginationInfo');
  const recordCount = document.getElementById('recordCount');
  const paginationCtrls = document.getElementById('paginationControls');
  
  // Safety: if elements don't exist yet, return silently (they'll render when section is loaded)
  if (!tbody || !empty || !info || !recordCount) return;
  
  recordCount.textContent = `${adminState.filtered.length} records`;

  if (!paged.length) {
    tbody.innerHTML = '';
    empty.style.display = 'flex'; empty.classList.add('visible');
    info.textContent = 'No records';
    if (paginationCtrls) paginationCtrls.innerHTML = '';
    return;
  }
  empty.style.display = ''; empty.classList.remove('visible');
  info.textContent = `Showing ${start + 1}–${Math.min(start + adminState.perPage, adminState.filtered.length)} of ${adminState.filtered.length}`;
  tbody.innerHTML = paged.map(r => `<tr onclick="openRecordModal(${JSON.stringify(r).replace(/"/g,'&quot;')})" style="cursor:pointer;">
    <td><strong style="font-weight:500">${escHtml(r.name)}</strong></td>
    <td class="mono">${escHtml(r.id)}</td>
    <td><span style="font-size:12px;padding:2px 8px;border-radius:20px;background:var(--bg);border:1px solid var(--border);">${escHtml(r.dept)}</span></td>
    <td class="mono">${fmtDate(r.date)}</td>
    <td class="mono">${r.checkIn || '—'}</td>
    <td class="mono">${r.checkOut || '—'}</td>
    <td class="mono">${r.duration || '—'}</td>
    <td>${chipHtml(r.status)}</td>
  </tr>`).join('');
  renderPagination(adminState.filtered.length);
}

function renderPagination(total) {
  const totalPages = Math.ceil(total / adminState.perPage);
  const ctrl = document.getElementById('paginationControls');
  if (totalPages <= 1) { ctrl.innerHTML = ''; return; }
  let html = '';
  html += `<button class="page-btn" ${adminState.page<=1?'disabled':''} onclick="goPage(${adminState.page-1})">‹</button>`;
  for (let i = 1; i <= Math.min(totalPages, 8); i++) {
    html += `<button class="page-btn ${i===adminState.page?'active':''}" onclick="goPage(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" ${adminState.page>=totalPages?'disabled':''} onclick="goPage(${adminState.page+1})">›</button>`;
  ctrl.innerHTML = html;
}
function goPage(p) { adminState.page = p; renderAdminTable(); }

// ===================================================
//  ADMIN: DASHBOARD
// ===================================================
function updateDashboard() {
  const records = getRecords();
  const lecturers = getLecturers();
  const today = new Date().toISOString().split('T')[0];
  const mostRecent = records.length ? records.reduce((a,b)=>a.date>b.date?a:b).date : today;
  const useDate = records.some(r=>r.date===today) ? today : mostRecent;
  const todayRecs = records.filter(r => r.date === useDate);
  const present = todayRecs.filter(r=>r.status==='Present').length;
  const late    = todayRecs.filter(r=>r.status==='Late').length;
  const absent  = todayRecs.filter(r=>r.status==='Absent').length;
  const leave   = todayRecs.filter(r=>r.status==='Leave'||r.status==='Online').length;
  const total   = lecturers.length;
  const settings = getSettings();
  const rate    = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  const el = id => document.getElementById(id);
  if (el('kpiPresent')) el('kpiPresent').textContent = present;
  if (el('kpiLate')) el('kpiLate').textContent = late;
  if (el('kpiAbsent')) el('kpiAbsent').textContent = absent;
  if (el('kpiTotal')) el('kpiTotal').textContent = total;
  if (el('kpiLateThreshold')) el('kpiLateThreshold').textContent = `After ${settings.workStart} + ${settings.lateThreshold}min`;
  
  // Display attendance rate
  if (el('kpiRate')) {
    el('kpiRate').innerHTML = `
      <div style="font-size:28px;font-weight:700;">${rate}%</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">${present + late} of ${total} present</div>
    `;
  }
  
  renderDeptChart(records, useDate);
  renderDonut(present, late, absent);
}

function renderAdminQuickStats() {
  const records = getRecords();
  const lecturers = getLecturers();
  const today = new Date().toISOString().split('T')[0];
  const mostRecent = records.length ? records.reduce((a,b)=>a.date>b.date?a:b).date : today;
  const useDate = records.some(r=>r.date===today) ? today : mostRecent;
  const useRecs = records.filter(r=>r.date===useDate);
  const pending = getLeaveRequests().filter(r=>r.status==='Pending').length;
  const approved = getLeaveRequests().filter(r=>r.status==='Approved').length;
  const total = lecturers.length;
  const active = useRecs.filter(r=>r.status==='Present'||r.status==='Late').length;
  const inactive = useRecs.filter(r=>r.status==='Absent').length;
  
  const el = id => document.getElementById(id);
  if (el('aqsTotal')) el('aqsTotal').textContent = total;
  if (el('aqsActive')) el('aqsActive').textContent = active;
  if (el('aqsInactive')) el('aqsInactive').textContent = inactive;
  if (el('aqsPending')) el('aqsPending').textContent = pending;
  
  // Additional metrics
  if (el('aqsApproved')) el('aqsApproved').textContent = approved;
  if (el('aqsAbsentRate')) {
    const rate = total > 0 ? Math.round((inactive / total) * 100) : 0;
    el('aqsAbsentRate').textContent = rate + '%';
  }
}

function updateApprovalBadge() {
  const pending = getLeaveRequests().filter(r=>r.status==='Pending').length;
  const badge = document.getElementById('adminApprovalBadge');
  if (badge) { badge.textContent = pending; badge.style.display = pending > 0 ? 'inline-flex' : 'none'; }
}

// ===================================================
//  ADMIN: CHARTS
// ===================================================
function renderDeptChart(records, date) {
  const container = document.getElementById('deptBarChart');
  if (!container) return;
  const recs = records.filter(r => r.date === date);
  const byDept = {};
  DEPARTMENTS.forEach(d => { byDept[d] = { present:0, late:0, absent:0, total:0 }; });
  recs.forEach(r => {
    if (!byDept[r.dept]) return;
    byDept[r.dept].total++;
    if (r.status==='Present') byDept[r.dept].present++;
    else if (r.status==='Late') byDept[r.dept].late++;
    else byDept[r.dept].absent++;
  });
  const max = Math.max(...DEPARTMENTS.map(d=>byDept[d].total), 1);
  container.innerHTML = DEPARTMENTS.map(d => {
    const data = byDept[d];
    const pct = Math.round(((data.present + data.late) / Math.max(data.total, 1)) * 100);
    const barW = Math.round((data.present + data.late) / max * 100);
    const shortDept = d.split(' ').map(w=>w[0]).join('');
    return `<div class="bar-row">
      <div class="bar-label" title="${escHtml(d)}">${shortDept}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${barW}%;background:${DEPT_COLORS[d]}"></div></div>
      <div class="bar-val">${pct}%</div>
    </div>`;
  }).join('');
}

function renderDonut(present, late, absent) {
  const svg = document.getElementById('donutSvg');
  const legend = document.getElementById('donutLegend');
  if (!svg || !legend) return;
  const total = present + late + absent || 1;
  const cx = 60, cy = 60, r = 45, stroke = 20;
  const segments = [
    { val: present, color: '#16A34A', label: 'Present' },
    { val: late,    color: '#D97706', label: 'Late' },
    { val: absent,  color: '#DC2626', label: 'Absent' },
  ];
  let paths = '', offset = 0;
  const circ = 2 * Math.PI * r;
  segments.forEach(seg => {
    const pct = seg.val / total;
    const len = pct * circ;
    paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${stroke}" stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" opacity="${seg.val?1:.15}"/>`;
    offset += len;
  });
  svg.innerHTML = paths + `<text x="${cx}" y="${cy+5}" text-anchor="middle" font-size="16" font-weight="600" fill="var(--text)">${Math.round((present+late)/total*100)}%</text>`;
  legend.innerHTML = segments.map(s => `<div class="legend-item"><span class="legend-dot" style="background:${s.color}"></span>${s.label}: <strong>${s.val}</strong></div>`).join('');
}

// ===================================================
//  ADMIN: ACTIVITY FEED
// ===================================================
function renderActivityFeed() {
  const container = document.getElementById('adminActivityFeed');
  if (!container) return;
  
  // Use audit logs to show both check-in and check-out activities
  let logs = getAuditLogs();
  const today = new Date().toISOString().split('T')[0];
  
  // Filter for check-in and check-out activities from today, sorted by timestamp desc
  const checkinCheckoutLogs = logs.filter(l => {
    const logDate = l.timestamp ? new Date(l.timestamp).toISOString().split('T')[0] : today;
    return (l.type === 'check-in' || l.type === 'check-out') && logDate === today;
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 8);
  
  if (!checkinCheckoutLogs.length) { 
    container.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">No activity today</div>`; 
    return; 
  }
  
  container.innerHTML = checkinCheckoutLogs.map(log => {
    const typeLabel = log.type === 'check-in' ? 'checked in' : 'checked out';
    const typeColor = log.type === 'check-in' ? 'dot-present' : 'dot-muted';
    const msg = `<strong>${escHtml(log.actor)}</strong> ${typeLabel}`;
    const time = new Date(log.timestamp).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    
    return `<div class="activity-item">
      <div class="activity-dot ${typeColor}"></div>
      <div class="activity-text">${msg} <span style="color:var(--text-faint);font-size:12px;">· ${escHtml(log.detail)}</span></div>
      <div class="activity-time">${time}</div>
    </div>`;
  }).join('');
}

// ===================================================
//  ADMIN: LECTURER GRID
// ===================================================
function renderLecturerGrid() {
  const lecturers = getLecturers();
  const records = getRecords();
  const grid = document.getElementById('lecturerGrid');
  if (!grid) return;
  const badge = document.getElementById('adminLecturerBadge');
  if (badge) badge.textContent = lecturers.length;
  grid.innerHTML = lecturers.map(lec => {
    const recs = records.filter(r => r.id === lec.id);
    const present = recs.filter(r=>r.status==='Present').length;
    const rate = recs.length ? Math.round((present/recs.length)*100) : 0;
    const latest = recs.sort((a,b)=>b.date.localeCompare(a.date))[0];
    const statusCls = latest ? (latest.status==='Present'?'present':latest.status==='Late'?'late':'absent') : 'absent';
    const late = recs.filter(r=>r.status==='Late').length;
    const deptColor = DEPT_COLORS[lec.dept] || AVATAR_COLORS[0];
    return `<div class="lecturer-card" onclick='openLecturerModal(${JSON.stringify(lec).replace(/"/g,"&quot;")})' style="cursor:pointer;--lec-color:${deptColor};">
      <div class="lec-card-accent" style="background:linear-gradient(135deg,${deptColor}20 0%,${deptColor}05 100%);"></div>
      <div class="lec-card-content">
        <div class="lec-card-top">
          <div class="lec-avatar" style="background:linear-gradient(135deg,${deptColor} 0%,${deptColor}cc 100%);box-shadow:0 4px 12px ${deptColor}40;">${lec.initials || lec.name[0]}</div>
          <div class="lec-info-wrap">
            <div class="lec-name-group">
              <h3 class="lec-name">${escHtml(lec.name)}</h3>
              <span class="lec-dept-badge" style="background:${deptColor}15;color:${deptColor};">${escHtml(lec.dept.split(' ')[0])}</span>
            </div>
            <p class="lec-id">${escHtml(lec.id)}</p>
          </div>
          <span class="lec-status-badge ${statusCls}">${latest ? latest.status : 'N/A'}</span>
        </div>
        <div class="lec-stats-grid">
          <div class="lec-stat-item">
            <div class="lec-stat-number">${recs.length}</div>
            <div class="lec-stat-label">Records</div>
            <div class="lec-stat-bar"><div class="lec-stat-bar-fill" style="width:100%"></div></div>
          </div>
          <div class="lec-stat-item">
            <div class="lec-stat-number" style="color:var(--success)">${present}</div>
            <div class="lec-stat-label">Present</div>
            <div class="lec-stat-bar"><div class="lec-stat-bar-fill" style="background:var(--success);width:${recs.length ? (present/recs.length)*100 : 0}%"></div></div>
          </div>
          <div class="lec-stat-item">
            <div class="lec-stat-number" style="color:var(--warning)">${late}</div>
            <div class="lec-stat-label">Late</div>
            <div class="lec-stat-bar"><div class="lec-stat-bar-fill" style="background:var(--warning);width:${recs.length ? (late/recs.length)*100 : 0}%"></div></div>
          </div>
          <div class="lec-stat-item">
            <div class="lec-stat-number" style="color:var(--blue);font-weight:700;">${rate}%</div>
            <div class="lec-stat-label">Attendance</div>
            <div class="lec-stat-bar"><div class="lec-stat-bar-fill" style="background:var(--blue);width:${rate}%"></div></div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ===================================================
//  ADMIN: APPROVALS
// ===================================================
function renderApprovals() {
  const filterStatus = document.getElementById('approvalFilterStatus')?.value || '';
  let requests = getLeaveRequests();
  if (filterStatus) requests = requests.filter(r => r.status === filterStatus);
  const container = document.getElementById('approvalList');
  const empty = document.getElementById('approvalEmpty');
  if (!container) return;
  updateApprovalBadge();
  if (!requests.length) {
    container.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';
  const icons = { Late: '🕐', Absent: '❌', Online: '💻', Reschedule: '📅' };
  container.innerHTML = requests.map(req => `
    <div class="approval-card ${req.status.toLowerCase()}">
      <div class="approval-header">
        <div>
          <div class="approval-title">${icons[req.type]||'📋'} ${escHtml(req.type)} Request — ${escHtml(req.lecturerName)}</div>
          <div class="approval-sub">${escHtml(req.dept)} · Submitted ${formatTimeAgo(req.submittedAt)}</div>
        </div>
        ${chipHtml(req.status)}
      </div>
      <div class="approval-meta">
        <div class="approval-field"><label>Class</label><span>${escHtml(req.classCode)}</span></div>
        <div class="approval-field"><label>Date</label><span>${fmtDate(req.date)}</span></div>
        <div class="approval-field"><label>Type</label><span>${escHtml(req.type)}</span></div>
        <div class="approval-field"><label>Reason</label><span>${escHtml(req.reason)}</span></div>
        ${req.type === 'Reschedule' && req.newDate ? `<div class="approval-field"><label>New Date</label><span>${fmtDate(req.newDate)} ${req.newTime || ''}</span></div>` : ''}
        ${req.type === 'Reschedule' && req.newRoom ? `<div class="approval-field"><label>New Room</label><span>${escHtml(req.newRoom)}</span></div>` : ''}
        ${req.proof ? `<div class="approval-field"><label>Proof</label><span><a href="${req.proof}" download="proof" style="color:var(--blue);font-size:13px;">View Document</a></span></div>` : ''}
      </div>
      ${req.adminNote ? `<div class="approval-note">Admin note: ${escHtml(req.adminNote)}</div>` : ''}
      ${req.status === 'Pending' ? `
      <div class="approval-actions">
        <input type="text" id="note_${req.id}" class="filter-input" placeholder="Optional admin note..." style="flex:1;padding:7px 12px;font-size:13px;">
        <button class="btn-approve" onclick="processApproval(${req.id}, 'Approved')">✓ Approve</button>
        <button class="btn-reject" onclick="processApproval(${req.id}, 'Rejected')">✗ Reject</button>
      </div>` : `<div class="approval-actions"><div class="approval-note">Decision: <strong>${req.status}</strong>${req.adminNote ? ' — ' + escHtml(req.adminNote) : ''}</div></div>`}
    </div>`).join('');
}

function processApproval(id, decision) {
  const requests = getLeaveRequests();
  const req = requests.find(r => r.id === id);
  if (!req || req.status !== 'Pending') { showToast('Request already processed', 'warning'); return; }
  
  const noteEl = document.getElementById(`note_${id}`);
  const adminNote = noteEl ? noteEl.value.trim() : '';
  req.status = decision;
  req.adminNote = adminNote;
  req.processedAt = new Date().toISOString();
  
  // Update attendance record if approved and class affected
  if (decision === 'Approved') {
    const records = getRecords();
    const idx = records.findIndex(r => r.id === req.lecturerId && r.date === req.date);
    const newStatus = req.type === 'Online' ? 'Online' : req.type === 'Absent' ? 'Leave' : req.type === 'Reschedule' ? 'Reschedule' : 'Leave';
    
    if (idx >= 0) { 
      records[idx].status = newStatus; 
      records[idx].reason = req.reason;
      records[idx].checkIn = req.type === 'Online' ? '08:00' : '';
    }
    else { 
      records.unshift({ 
        name: req.lecturerName, 
        id: req.lecturerId, 
        dept: req.dept, 
        date: req.date, 
        checkIn: req.type === 'Online' ? '08:00' : '',
        checkOut: req.type === 'Online' ? '17:00' : '', 
        duration: req.type === 'Online' ? '9h' : '', 
        status: newStatus, 
        reason: req.reason 
      }); 
    }
    ls_set(KEYS.attendanceRecs, records);
    
    // Mark class as unavailable if leave is for that date/time
    if (req.type === 'Absent' || req.type === 'Reschedule') {
      const schedule = ls_get(KEYS.schedules, []);
      schedule.forEach(slot => {
        if (slot.lecturer === req.lecturerId && slot.date === req.date && slot.code === req.classCode) {
          slot.available = false;
          slot.leaveReason = req.type;
          if (req.newDate && req.type === 'Reschedule') {
            slot.rescheduledTo = req.newDate;
            slot.rescheduledTime = req.newTime || slot.time;
            slot.rescheduledRoom = req.newRoom || slot.room;
          }
        }
      });
      ls_set(KEYS.schedules, schedule);
    }
  }
  
  ls_set(KEYS.leaveRequests, requests);
  const session = getSession();
  addAuditLog('approval', session?.name || 'Admin', `${decision} ${req.type} request for ${req.lecturerName} — ${req.classCode} on ${req.date}${adminNote ? ': ' + adminNote : ''}`, 'approval');
  broadcastApprovalNotification(req, decision, adminNote);
  updateApprovalBadge();
  renderApprovals();
  showToast(`✓ Request ${decision} — ${req.lecturerName} notified`);
}

document.getElementById('approvalFilterStatus')?.addEventListener('change', renderApprovals);

// ===================================================
//  ADMIN: EXPORT (CSV + Excel via SheetJS)
// ===================================================
function getFilteredExportData() {
  const from   = document.getElementById('exportDateFrom')?.value || '';
  const to     = document.getElementById('exportDateTo')?.value || '';
  const dept   = document.getElementById('exportDept')?.value || '';
  const status = document.getElementById('exportStatus')?.value || '';
  const records = getRecords();
  const requests = getLeaveRequests();
  return records.filter(r => {
    if (from && r.date < from) return false;
    if (to && r.date > to) return false;
    if (dept && r.dept !== dept) return false;
    if (status && r.status !== status) return false;
    return true;
  }).map(r => {
    const lr = requests.find(x => x.lecturerId === r.id && x.date === r.date);
    return { ...r, leaveReason: lr ? lr.reason : r.reason || '' };
  });
}

function exportCSV(data) {
  const headers = ['Lecturer Name','Staff ID','Department','Date','Scheduled Start','Check In','Check Out','Duration','Status','Reason'];
  const rows = data.map(r => [r.name, r.id, r.dept, r.date, '08:00', r.checkIn||'', r.checkOut||'', r.duration||'', r.status, r.leaveReason||'']);
  const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  downloadBlob(csv, 'text/csv', 'orbyte_attendance_export.csv');
  const session = getSession();
  addAuditLog('export', session?.name || 'Admin', `Exported ${data.length} records as CSV`, 'export');
  showToast(`✓ CSV downloaded (${data.length} records)`);
}

function exportExcel(data) {
  // Check if XLSX library is available (local file, no CORS issues)
  if (typeof XLSX === 'undefined') { 
    showToast('SheetJS library not loaded. Please refresh.', 'error'); 
    return; 
  }
  try {
    // ===== ATTENDANCE SHEET =====
    const headers = ['Lecturer Name','Staff ID','Department','Date','Day','Scheduled','Check In','Check Out','Duration','Status','Reason'];
    const rows = data.map(r => {
      const d = new Date(r.date + 'T00:00:00');
      const day = d.toLocaleDateString('en-GB', { weekday: 'short' });
      return [r.name, r.id, r.dept, r.date, day, '08:00–17:00', r.checkIn||'', r.checkOut||'', r.duration||'', r.status, r.leaveReason||''];
    });
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    // Column widths
    ws['!cols'] = [18,14,20,14,12,14,12,12,12,14,25].map(w=>({wch:w}));
    
    // Set row heights for better readability
    ws['!rows'] = [{ hpt: 28 }, ...rows.map(() => ({ hpt: 24 }))];
    
    // Style header row - Professional gradient effect
    const headerStyle = {
      fill: { fgColor: { rgb: 'FF1D4ED8' } }, // Professional blue
      font: { bold: true, color: { rgb: 'FFFFFFFF' }, size: 12, name: 'Calibri' },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'medium', color: { rgb: 'FF0F2D56' } },
        bottom: { style: 'medium', color: { rgb: 'FF0F2D56' } },
        left: { style: 'medium', color: { rgb: 'FF0F2D56' } },
        right: { style: 'medium', color: { rgb: 'FF0F2D56' } }
      }
    };
    
    // Apply header styles
    for (let i = 0; i < headers.length; i++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
      ws[cellRef].s = headerStyle;
    }
    
    // Style data rows with professional borders
    const borderStyle = {
      top: { style: 'thin', color: { rgb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { rgb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { rgb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { rgb: 'FFD1D5DB' } }
    };
    
    const statusColors = {
      'Present': 'FF10B981', // Teal Green
      'Late': 'FFF59E0B', // Amber
      'Absent': 'FFEF4444', // Red
      'Leave': 'FF8B5CF6', // Purple
      'Online': 'FF06B6D4', // Cyan
      'Reschedule': 'FFEAB308' // Yellow
    };
    
    for (let i = 0; i < rows.length; i++) {
      for (let j = 0; j < headers.length; j++) {
        const cellRef = XLSX.utils.encode_cell({ r: i + 1, c: j });
        if (!ws[cellRef]) continue;
        
        // Alternating row colors for better readability
        const bgColor = i % 2 === 0 ? 'FFFAFBFC' : 'FFFFFFFF';
        
        // Status column - color-coded with professional gradients
        if (j === 9) { // Status column
          const status = rows[i][j];
          const statusColor = statusColors[status] || 'FFE5E7EB';
          ws[cellRef].s = {
            fill: { fgColor: { rgb: statusColor } },
            font: { bold: true, color: { rgb: 'FFFFFFFF' }, size: 11, name: 'Calibri' },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: borderStyle
          };
        } else {
          ws[cellRef].s = {
            fill: { fgColor: { rgb: bgColor } },
            font: { size: 10, color: { rgb: 'FF1F2937' }, name: 'Calibri' },
            alignment: { horizontal: j <= 2 ? 'left' : 'center', vertical: 'center' },
            border: borderStyle
          };
        }
      }
    }
    
    // Freeze header row for easy scrolling
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    
    // ===== SUMMARY SHEET - Professional Report Layout =====
    const present = data.filter(r=>r.status==='Present').length;
    const late = data.filter(r=>r.status==='Late').length;
    const absent = data.filter(r=>r.status==='Absent').length;
    const leave = data.filter(r=>r.status==='Leave'||r.status==='Online').length;
    const reschedule = data.filter(r=>r.status==='Reschedule').length;
    const attendanceRate = present > 0 ? Math.round((present/data.length)*100) : 0;
    
    const summary = [
      [''],
      ['ORBYTE UniAttend'],
      ['Attendance Summary Report'],
      [''],
      [`Report Generated: ${new Date().toLocaleString('en-MY')}`],
      [`Total Records Analyzed: ${data.length}`],
      [''],
      ['ATTENDANCE BREAKDOWN'],
      ['Status', 'Count', 'Percentage', 'Rate'],
      ['Present', present, `${((present/data.length)*100).toFixed(1)}%`, '█████████░'],
      ['Late', late, `${((late/data.length)*100).toFixed(1)}%`, '████░░░░░░'],
      ['Absent', absent, `${((absent/data.length)*100).toFixed(1)}%`, '██░░░░░░░░'],
      ['Leave/Online', leave, `${((leave/data.length)*100).toFixed(1)}%`, '███░░░░░░░'],
      ['Reschedule', reschedule, `${((reschedule/data.length)*100).toFixed(1)}%`, '█░░░░░░░░░'],
      [''],
      ['KEY METRICS'],
      ['Overall Attendance Rate', `${attendanceRate}%`, ''],
      ['Present Days', present, ''],
      ['Absent Days', absent, ''],
      [''],
      ['Report Details'],
      ['Organization', 'ORBYTE UniAttend System', ''],
      ['Report Type', 'Attendance Analysis', ''],
      ['Data Range', `${data.length > 0 ? data[0].date : 'N/A'} to ${data.length > 0 ? data[data.length-1].date : 'N/A'}`, '']
    ];
    
    const ws2 = XLSX.utils.aoa_to_sheet(summary);
    ws2['!cols'] = [25, 15, 18, 20].map(w=>({wch:w}));
    ws2['!rows'] = [
      { hpt: 8 },    // Row 1
      { hpt: 30 },   // Row 2 - Title
      { hpt: 24 },   // Row 3 - Subtitle
      { hpt: 8 },
      { hpt: 18 },
      { hpt: 18 },
      { hpt: 8 },
      { hpt: 24 },   // Section title
      { hpt: 26 },   // Header
      ...Array(5).fill({ hpt: 22 }),
      { hpt: 8 },
      { hpt: 24 },
      ...Array(3).fill({ hpt: 20 }),
      { hpt: 8 },
      { hpt: 24 },
      ...Array(3).fill({ hpt: 18 })
    ];
    
    // Title styling
    if (ws2['A2']) {
      ws2['A2'].s = {
        font: { bold: true, size: 18, color: { rgb: 'FF1D4ED8' }, name: 'Calibri' },
        alignment: { horizontal: 'left', vertical: 'center' },
        fill: { fgColor: { rgb: 'FFF0F4FF' } }
      };
    }
    
    // Subtitle styling
    if (ws2['A3']) {
      ws2['A3'].s = {
        font: { bold: true, size: 14, color: { rgb: '003B5C' }, name: 'Calibri' },
        alignment: { horizontal: 'left', vertical: 'center' }
      };
    }
    
    // Report info styling
    for (let i = 4; i <= 5; i++) {
      const cellRef = XLSX.utils.encode_cell({ r: i, c: 0 });
      if (ws2[cellRef]) {
        ws2[cellRef].s = {
          font: { size: 10, color: { rgb: 'FF666666' }, name: 'Calibri' },
          alignment: { horizontal: 'left', vertical: 'center' }
        };
      }
    }
    
    // Section headers
    const sectionHeaderStyle = {
      fill: { fgColor: { rgb: 'FF1D4ED8' } },
      font: { bold: true, color: { rgb: 'FFFFFFFF' }, size: 12, name: 'Calibri' },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: {
        top: { style: 'medium', color: { rgb: 'FF0F2D56' } },
        bottom: { style: 'medium', color: { rgb: 'FF0F2D56' } },
        left: { style: 'medium', color: { rgb: 'FF0F2D56' } },
        right: { style: 'medium', color: { rgb: 'FF0F2D56' } }
      }
    };
    
    // Style breakdown table header (row 8)
    for (let j = 0; j < 4; j++) {
      const cellRef = XLSX.utils.encode_cell({ r: 8, c: j });
      if (ws2[cellRef]) ws2[cellRef].s = sectionHeaderStyle;
    }
    
    // Style status rows with professional colors
    const statusRowColors = [
      { bg: 'FF10B98120', text: 'FF059669' }, // Present - Green
      { bg: 'FFF59E0B20', text: 'FFD97706' }, // Late - Amber
      { bg: 'FFEF444420', text: 'FFDC2626' }, // Absent - Red
      { bg: 'FF8B5CF620', text: 'FF7C3AED' }, // Leave - Purple
      { bg: 'FFEAB30820', text: 'FFF59E0B' }  // Reschedule - Yellow
    ];
    
    for (let i = 9; i <= 13; i++) {
      const rowColorSet = statusRowColors[i - 9];
      for (let j = 0; j < 4; j++) {
        const cellRef = XLSX.utils.encode_cell({ r: i, c: j });
        if (ws2[cellRef]) {
          ws2[cellRef].s = {
            fill: { fgColor: { rgb: rowColorSet.bg } },
            font: { 
              size: 11, 
              bold: j === 0, 
              color: { rgb: j === 0 ? rowColorSet.text : 'FF1F2937' },
              name: 'Calibri'
            },
            alignment: { horizontal: j === 0 ? 'left' : 'center', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: 'FFE5E7EB' } },
              bottom: { style: 'thin', color: { rgb: 'FFE5E7EB' } },
              left: { style: 'thin', color: { rgb: 'FFE5E7EB' } },
              right: { style: 'thin', color: { rgb: 'FFE5E7EB' } }
            }
          };
        }
      }
    }
    
    // Key Metrics section header
    const metricsHeaderRef = XLSX.utils.encode_cell({ r: 15, c: 0 });
    if (ws2[metricsHeaderRef]) {
      ws2[metricsHeaderRef].s = {
        fill: { fgColor: { rgb: 'FF1D4ED8' } },
        font: { bold: true, color: { rgb: 'FFFFFFFF' }, size: 12, name: 'Calibri' },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'medium', color: { rgb: 'FF0F2D56' } },
          bottom: { style: 'medium', color: { rgb: 'FF0F2D56' } },
          left: { style: 'medium', color: { rgb: 'FF0F2D56' } },
          right: { style: 'medium', color: { rgb: 'FF0F2D56' } }
        }
      };
    }
    
    // Metrics data styling
    for (let i = 16; i <= 18; i++) {
      const cellRef = XLSX.utils.encode_cell({ r: i, c: 0 });
      if (ws2[cellRef]) {
        ws2[cellRef].s = {
          font: { bold: true, size: 11, color: { rgb: 'FF1F2937' }, name: 'Calibri' },
          fill: { fgColor: { rgb: 'FFF3F4F6' } },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: {
            left: { style: 'thin', color: { rgb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { rgb: 'FFE5E7EB' } },
            top: { style: 'thin', color: { rgb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { rgb: 'FFE5E7EB' } }
          }
        };
      }
      const valRef = XLSX.utils.encode_cell({ r: i, c: 1 });
      if (ws2[valRef]) {
        ws2[valRef].s = {
          font: { bold: true, size: 11, color: { rgb: 'FF1D4ED8' }, name: 'Calibri' },
          fill: { fgColor: { rgb: 'FFF0F4FF' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            left: { style: 'thin', color: { rgb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { rgb: 'FFE5E7EB' } },
            top: { style: 'thin', color: { rgb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { rgb: 'FFE5E7EB' } }
          }
        };
      }
    }
    
    // Report details section
    const detailsHeaderRef = XLSX.utils.encode_cell({ r: 20, c: 0 });
    if (ws2[detailsHeaderRef]) {
      ws2[detailsHeaderRef].s = {
        fill: { fgColor: { rgb: 'FF1D4ED8' } },
        font: { bold: true, color: { rgb: 'FFFFFFFF' }, size: 12, name: 'Calibri' },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'medium', color: { rgb: 'FF0F2D56' } },
          bottom: { style: 'medium', color: { rgb: 'FF0F2D56' } },
          left: { style: 'medium', color: { rgb: 'FF0F2D56' } },
          right: { style: 'medium', color: { rgb: 'FF0F2D56' } }
        }
      };
    }
    
    // Details data styling
    for (let i = 21; i <= 23; i++) {
      const cellRef = XLSX.utils.encode_cell({ r: i, c: 0 });
      if (ws2[cellRef]) {
        ws2[cellRef].s = {
          font: { bold: true, size: 10, color: { rgb: 'FF1F2937' }, name: 'Calibri' },
          fill: { fgColor: { rgb: 'FFF3F4F6' } },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: { left: { style: 'thin', color: { rgb: 'FFE5E7EB' } }, right: { style: 'thin', color: { rgb: 'FFE5E7EB' } } }
        };
      }
      const valRef = XLSX.utils.encode_cell({ r: i, c: 1 });
      if (ws2[valRef]) {
        ws2[valRef].s = {
          font: { size: 10, color: { rgb: 'FF1F2937' }, name: 'Calibri' },
          fill: { fgColor: { rgb: 'FFFAFBFC' } },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: { left: { style: 'thin', color: { rgb: 'FFE5E7EB' } }, right: { style: 'thin', color: { rgb: 'FFE5E7EB' } } }
        };
      }
    }
    
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary');
    
    // Write file with professional naming
    const fileName = `orbyte_attendance_${new Date().toISOString().split('T')[0]}_${new Date().getHours()}-${String(new Date().getMinutes()).padStart(2,'0')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    const session = getSession();
    addAuditLog('export', session?.name || 'Admin', `Exported ${data.length} records as professional Excel report`, 'export');
    showToast(`✓ Excel downloaded (${data.length} records with professional formatting)`);
  } catch(err) {
    console.error('Excel export error:', err);
    showToast('Excel export failed. Try CSV instead.', 'error');
  }
}

function exportAuditCSV() {
  const logs = getAuditLogs();
  const headers = ['Timestamp','Action','Actor','Detail','Type'];
  const rows = logs.map(l => [new Date(l.timestamp).toLocaleString(), l.action, l.actor, l.detail, l.type]);
  const csv = [headers, ...rows].map(row => row.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  downloadBlob(csv, 'text/csv', 'orbyte_audit_log.csv');
  showToast(`✓ Audit log exported (${logs.length} entries)`);
}

function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function setDefaultExportFilters() {
  const today = new Date();
  const prior = new Date(today); prior.setDate(prior.getDate() - 30);
  const el = id => document.getElementById(id);
  if (el('exportDateFrom')) el('exportDateFrom').value = prior.toISOString().split('T')[0];
  if (el('exportDateTo')) el('exportDateTo').value = today.toISOString().split('T')[0];
}

// Export buttons
document.getElementById('exportCsvDash').addEventListener('click', () => exportCSV(getRecords()));
document.getElementById('exportExcelDash').addEventListener('click', () => exportExcel(getRecords().map(r => ({ ...r, leaveReason: r.reason || '' }))));
document.getElementById('exportCsvRecords').addEventListener('click', () => exportCSV(adminState.filtered.length ? adminState.filtered.map(r=>({...r,leaveReason:r.reason||''})) : getRecords().map(r=>({...r,leaveReason:r.reason||''}))));
document.getElementById('exportCsvAll').addEventListener('click', () => exportCSV(getFilteredExportData()));
document.getElementById('exportExcelAll').addEventListener('click', () => exportExcel(getFilteredExportData()));
document.getElementById('exportAuditCsv')?.addEventListener('click', exportAuditCSV);

// ===================================================
//  IMPORT EXCEL — Download Template
// ===================================================
document.addEventListener('click', function(e) {
  if (e.target.closest('#downloadTemplateBtn')) {
    // Embedded template file (Base64) — replace b64Data to update template
    const b64Data = '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rS3Zl+z0Xona2kZ+yR55r/e0rQ3eq0zZ2pJ9yX5ZspbGLumnLC3qEnqvO1C7kqPfhPfIe72nbW1w1WTK1pbsS3Z6r0RtbSPvdY+813ta10bvVaZ0bZH3utN7JaqCLC3qEnqvO71XQZYW7Uvove70XgVZWtQl9F53eq+CLC3al9B73YHa6zbcl0Te687zXola2sgv2SPv9Z62TwD3JUPvdY+813va0tglQ+91j7zXe9rSuC8Zeq975L3e05pG71Wm9D0Zea87vVeiKsjSoi6h97oDtbThviTyXnd6r0QtbXiPE3mvO71XopY23JdE3utO75WopQ27JPJed3qvRC1t2CWR97rTeyVqacN9SeS97vReiVra8B7n0lYf3y3Se93pvQrSz1vkve70XomqIEuL7nHove70XgVZWtQl9F53eq+CLC3al9B73em9CrK0aF9C73Wn9yrI0qJ9Cb3Xnd6rIEuL7nHove5A7T057JLIe93pvRK1tGGXRN7rTu+VqKUNu+TSVh93Cb3Xnd6rIH3dIu91p/dKVAVZWtQl9F53eq+CLC3qEnqvO71XQZYWdQm9153eqyBLi7qE3utO71WQpUVdQu91p/cqyNKiLqH3utN7FWRp0fcl9F53eq+CLC367pXe607vVZClRd+X0Hvd6b0K0rTIe93pvRJVQZYWdQm9153eqyBLi7qE3utO71WQpUVdQu91p/cqyNKiLqH3utN7FWRpUZfQe93pvQqytKhL6L3u9F4FWVrUJfRed3qvgiwt6hJ6rzu9V0GWFnUJvded3qsgTYu8153eK1EVZGlRl9B73em9CrK0qEvove70XgVZWtQl9F53eq+CLC3qEnqvO71XQZYWdQm9153eqyBLi7qE3utO71WQpUVdQu91p/cqyNKiLqH3utN7FWRpUZfQe93pvQrStMh73em9ElVBlhZ1Cb3Xnd6rIEuLuoTe607vVZClRV1C73Wn9yrI0qIuofe603sVZGlRl9B73em9CrK0qEvove70XgVZWtQl9F53eq+CLC3qEnqvO71XQZYWdQm9153eqyBNi7zXnd4rURVkaVGX0Hvd6b0KsrSoS+i97vReBVla1CX0Xnd6r4IsLeoSeq87vVdBlhZ1Cb3Xnd6rIEuLuoTe607vVZClRV1C73Wn9yrI0qIuofe603sVZGlRl9B73em9CpK0I/Je72n5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';
    const byteChars = atob(b64Data);
    const byteNums = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
    const byteArray = new Uint8Array(byteNums);
    const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orbyte_attendance_template.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✓ Template downloaded!');
  }
});

// ===================================================
//  IMPORT EXCEL — Read & Preview
// ===================================================
let _importParsedData = [];

document.getElementById('importFileInput')?.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (typeof XLSX === 'undefined') { showToast('SheetJS library not loaded.', 'error'); return; }
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const wb = XLSX.read(ev.target.result, { type: 'binary', cellText: false, cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];

      // Helper: convert Excel time serial (e.g. 0.354...) to "HH:MM" string
      function excelTimeToStr(v) {
        if (v === '' || v === null || v === undefined) return '';
        // Already a string like "08:00"
        if (typeof v === 'string') {
          const m = v.match(/^(\d{1,2}):(\d{2})/);
          if (m) return `${String(m[1]).padStart(2,'0')}:${m[2]}`;
          return v.trim();
        }
        // Date object (from cellDates:true)
        if (v instanceof Date) {
          const h = v.getUTCHours(), mn = v.getUTCMinutes();
          return `${String(h).padStart(2,'0')}:${String(mn).padStart(2,'0')}`;
        }
        // Numeric fraction of a day (0–1)
        if (typeof v === 'number' && v >= 0 && v < 1) {
          const totalMins = Math.round(v * 24 * 60);
          const h = Math.floor(totalMins / 60), mn = totalMins % 60;
          return `${String(h).padStart(2,'0')}:${String(mn).padStart(2,'0')}`;
        }
        return String(v).trim();
      }

      // Read raw cell values to avoid SheetJS auto-formatting issues
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      const headers = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r: range.s.r, c });
        headers.push(ws[addr] ? String(ws[addr].v || '').trim() : '');
      }

      const rows = [];
      for (let r = range.s.r + 1; r <= range.e.r; r++) {
        const row = {};
        let hasData = false;
        for (let c = range.s.c; c <= range.e.c; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = ws[addr];
          row[headers[c - range.s.c]] = cell ? cell.v : '';
          if (cell && cell.v !== '' && cell.v !== null && cell.v !== undefined) hasData = true;
        }
        if (hasData) rows.push(row);
      }

      if (!rows.length) { showToast('File kosong atau format salah.', 'error'); return; }

      const normalize = str => String(str).trim().toLowerCase().replace(/\s+/g,'');
      const FIELD_MAP = {
        'lecturername':'name','name':'name','staffid':'id','id':'id',
        'department':'dept','dept':'dept','date':'date',
        'checkin':'checkIn','checkout':'checkOut',
        'status':'status','reason':'reason','leavereason':'reason',
      };
      const TIME_FIELDS = new Set(['checkIn','checkOut']);
      const VALID_STATUSES = ['Present','Late','Absent','Leave','Online','Reschedule'];
      const errors = [];
      const parsed = [];
      rows.forEach((row, i) => {
        const rec = {};
        Object.entries(row).forEach(([k, v]) => {
          const mapped = FIELD_MAP[normalize(k)];
          if (!mapped) return;
          rec[mapped] = TIME_FIELDS.has(mapped) ? excelTimeToStr(v) : String(v === null || v === undefined ? '' : v).trim();
        });
        if (!rec.name)   errors.push(`Baris ${i+2}: Lecturer Name kosong`);
        if (!rec.id)     errors.push(`Baris ${i+2}: Staff ID kosong`);
        if (!rec.dept)   errors.push(`Baris ${i+2}: Department kosong`);
        if (!rec.date)   errors.push(`Baris ${i+2}: Date kosong`);
        if (!rec.status) errors.push(`Baris ${i+2}: Status kosong`);
        else if (!VALID_STATUSES.includes(rec.status))
          errors.push(`Baris ${i+2}: Status "${rec.status}" tidak valid`);
        // Normalize date
        if (rec.date) {
          const raw = rec.date;
          if (typeof raw === 'number') {
            // Excel date serial
            const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
            rec.date = d.toISOString().split('T')[0];
          } else {
            const d = new Date(raw);
            if (!isNaN(d)) rec.date = d.toISOString().split('T')[0];
          }
        }
        rec.duration = calcDuration(rec.checkIn || '', rec.checkOut || '');
        rec.reason = rec.reason || '';
        parsed.push(rec);
      });
      _importParsedData = parsed;
      renderImportPreview(parsed, errors);
    } catch(err) {
      console.error('Import error:', err);
      showToast('Gagal membaca file. Pastikan format .xlsx/.xls.', 'error');
    }
  };
  reader.readAsBinaryString(file);
});

const importDropZone = document.getElementById('importDropZone');
importDropZone?.addEventListener('dragover', e => { e.preventDefault(); importDropZone.style.borderColor = 'var(--blue)'; importDropZone.style.background = 'var(--blue-light)'; });
importDropZone?.addEventListener('dragleave', () => { importDropZone.style.borderColor = ''; importDropZone.style.background = ''; });
importDropZone?.addEventListener('drop', e => {
  e.preventDefault();
  importDropZone.style.borderColor = ''; importDropZone.style.background = '';
  const file = e.dataTransfer.files[0];
  if (file) {
    const input = document.getElementById('importFileInput');
    const dt = new DataTransfer(); dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change'));
  }
});

function renderImportPreview(data, errors) {
  const wrap    = document.getElementById('importPreviewWrap');
  const head    = document.getElementById('importPreviewHead');
  const body    = document.getElementById('importPreviewBody');
  const countEl = document.getElementById('importPreviewCount');
  const errEl   = document.getElementById('importErrorBanner');
  if (!wrap) return;
  wrap.style.display = 'block';
  countEl.textContent = `${data.length} baris ditemukan`;
  if (errors.length) {
    errEl.style.display = 'block';
    errEl.innerHTML = `<strong>⚠ ${errors.length} peringatan:</strong><br>` + errors.slice(0,5).map(e=>`• ${e}`).join('<br>') + (errors.length>5?`<br>...dan ${errors.length-5} lainnya`:'');
  } else { errEl.style.display = 'none'; }
  const cols   = ['name','id','dept','date','checkIn','checkOut','status','reason'];
  const labels = ['Lecturer Name','Staff ID','Department','Date','Check In','Check Out','Status','Reason'];
  head.innerHTML = `<tr>${labels.map(l=>`<th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;color:var(--text-muted);white-space:nowrap;border-bottom:1px solid var(--border);">${l}</th>`).join('')}</tr>`;
  const SC = { Present:'var(--success)', Late:'var(--warning)', Absent:'var(--danger)', Leave:'#92400e', Online:'#6d28d9', Reschedule:'#0369a1' };
  body.innerHTML = data.slice(0,50).map(r => `<tr style="border-bottom:1px solid var(--border);">
    ${cols.map(c => {
      let val = escHtml(r[c]||'—');
      if (c==='status' && r[c]) val = `<span style="font-size:11px;font-weight:600;color:${SC[r[c]]||'var(--text)'};">${val}</span>`;
      return `<td style="padding:8px 12px;font-size:13px;white-space:nowrap;">${val}</td>`;
    }).join('')}
  </tr>`).join('') + (data.length>50?`<tr><td colspan="${cols.length}" style="padding:10px 12px;font-size:12px;color:var(--text-muted);text-align:center;">...dan ${data.length-50} baris lainnya</td></tr>`:'');
}

document.getElementById('importConfirmBtn')?.addEventListener('click', () => {
  if (!_importParsedData.length) return;
  const existing = getRecords();
  const existingKeys = new Set(existing.map(r => r.id + '|' + r.date));
  const newRecs = _importParsedData.filter(r => !existingKeys.has(r.id + '|' + r.date));
  const dupCount = _importParsedData.length - newRecs.length;
  ls_set(KEYS.attendanceRecs, [...existing, ...newRecs]);
  document.getElementById('importPreviewWrap').style.display = 'none';
  document.getElementById('importFileInput').value = '';
  _importParsedData = [];
  const msg = dupCount > 0
    ? `✓ ${newRecs.length} data diimport, ${dupCount} duplikat dilewati`
    : `✓ ${newRecs.length} data berhasil diimport! Lihat di tab Attendance Records.`;
  showToast(msg, 'success');
  renderAdminTable();
  renderExportBar();
  updateDashboard();
  applyAdminFilters();
  // Navigasi ke tab Records supaya user bisa langsung lihat data
  setTimeout(() => {
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    const recBtn = document.querySelector('.sidebar-item[data-section="records"]');
    if (recBtn) recBtn.classList.add('active');
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    const recSection = document.getElementById('section-records');
    if (recSection) recSection.classList.add('active');
    applyAdminFilters();
  }, 1200);
});

document.getElementById('importCancelBtn')?.addEventListener('click', () => {
  document.getElementById('importPreviewWrap').style.display = 'none';
  document.getElementById('importFileInput').value = '';
  _importParsedData = [];
});

// ===================================================
//  ADMIN: EXPORT BAR CHART
// ===================================================
function renderExportBar() {
  const container = document.getElementById('exportBarChart');
  if (!container) return;
  const records = getRecords();
  const statuses = ['Present','Late','Absent','Leave','Online','Reschedule'];
  const colors = { Present:'#16A34A', Late:'#D97706', Absent:'#DC2626', Leave:'#f59e0b', Online:'#7c3aed', Reschedule:'#0891b2' };
  const counts = {};
  statuses.forEach(s => counts[s] = records.filter(r => r.status === s).length);
  const max = Math.max(...Object.values(counts), 1);
  container.innerHTML = statuses.map(s => `<div class="bar-row">
    <div class="bar-label">${s}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${Math.round(counts[s]/max*100)}%;background:${colors[s]}"></div></div>
    <div class="bar-val">${counts[s]}</div>
  </div>`).join('');
}

// ===================================================
//  ADMIN: AUDIT LOG
// ===================================================
function renderAuditLog() {
  const filterType = document.getElementById('auditFilterType')?.value || '';
  const search = document.getElementById('auditSearch')?.value.toLowerCase() || '';
  let logs = getAuditLogs();
  if (filterType) logs = logs.filter(l => l.type === filterType);
  if (search) logs = logs.filter(l => (l.actor||'').toLowerCase().includes(search) || (l.detail||'').toLowerCase().includes(search));
  const container = document.getElementById('auditLogList');
  const empty = document.getElementById('auditEmpty');
  const count = document.getElementById('auditCount');
  if (count) count.textContent = logs.length + ' entries';
  if (!logs.length) {
    if (container) container.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';
  const dotCls = { 'check-in': 'ad-checkin', 'check-out': 'ad-checkout', 'leave-request': 'ad-leave', 'approval': 'ad-approval', 'settings': 'ad-settings', 'export': 'ad-export' };
  if (container) container.innerHTML = logs.map(l => `
    <div class="audit-item">
      <div class="audit-dot ${dotCls[l.type] || 'ad-checkin'}"></div>
      <div class="audit-action"><strong>${escHtml(l.actor)}</strong> — ${escHtml(l.detail)}</div>
      <div class="audit-ts">${new Date(l.timestamp).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
    </div>`).join('');
}

document.getElementById('auditFilterType')?.addEventListener('change', renderAuditLog);
document.getElementById('auditSearch')?.addEventListener('input', () => {
  clearTimeout(document.getElementById('auditSearch')._t);
  document.getElementById('auditSearch')._t = setTimeout(renderAuditLog, 250);
});
document.getElementById('clearAuditBtn')?.addEventListener('click', () => {
  if (!confirm('Clear all audit logs?')) return;
  ls_set(KEYS.auditLogs, []);
  renderAuditLog();
  showToast('✓ Audit logs cleared');
});

// ===================================================
//  ADMIN: SETTINGS
// ===================================================
function loadAdminSettings() {
  const s = getSettings();
  const el = id => document.getElementById(id);
  if (el('settingLateThreshold')) el('settingLateThreshold').value = s.lateThreshold;
  if (el('settingAbsentThreshold')) el('settingAbsentThreshold').value = s.absentThreshold;
  if (el('settingWorkStart')) el('settingWorkStart').value = s.workStart;
  if (el('settingWorkEnd')) el('settingWorkEnd').value = s.workEnd;
  if (el('settingValidationMode')) { el('settingValidationMode').value = s.validationMode; toggleValidationFields(s.validationMode); }
  if (el('settingQrCode')) el('settingQrCode').value = s.qrCode;
  if (el('settingLat')) el('settingLat').value = s.campusLat;
  if (el('settingLng')) el('settingLng').value = s.campusLng;
  if (el('settingRadius')) el('settingRadius').value = s.campusRadius;
  if (el('adminQrDisplay')) el('adminQrDisplay').textContent = s.qrCode;
  // Toggles
  const setToggle = (id, val) => { const t = el(id); if (t) { t.classList.toggle('on', val); t.setAttribute('aria-pressed', val.toString()); } };
  setToggle('toggleLateAlert', s.notifyLate !== false);
  setToggle('toggleAbsenceAlert', s.notifyAbsent !== false);
  setToggle('toggleLeaveAlert', s.notifyLeave !== false);
  setToggle('toggleWeekend', !!s.notifyWeekend);
}

function toggleValidationFields(mode) {
  const qr = document.getElementById('qrSettings');
  const gps = document.getElementById('gpsSettings');
  if (qr) qr.style.display = mode === 'qr' ? 'block' : 'none';
  if (gps) gps.style.display = mode === 'gps' ? 'block' : 'none';
}

document.getElementById('settingValidationMode')?.addEventListener('change', function() { toggleValidationFields(this.value); });

document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
  const s = getSettings();
  const el = id => document.getElementById(id);
  s.lateThreshold  = parseInt(el('settingLateThreshold')?.value) || 15;
  s.absentThreshold= parseInt(el('settingAbsentThreshold')?.value) || 30;
  s.workStart      = el('settingWorkStart')?.value || '08:00';
  s.workEnd        = el('settingWorkEnd')?.value || '17:00';
  saveSettings(s);
  const session = getSession();
  addAuditLog('settings', session?.name || 'Admin', `Updated attendance rules: late=${s.lateThreshold}min, absent=${s.absentThreshold}min, start=${s.workStart}`, 'settings');
  showToast('✓ Attendance settings saved');
});

document.getElementById('saveValidationBtn')?.addEventListener('click', () => {
  const s = getSettings();
  const el = id => document.getElementById(id);
  s.validationMode = el('settingValidationMode')?.value || 'none';
  s.qrCode         = el('settingQrCode')?.value || 'ORBYTE-CAMPUS-2025';
  s.campusLat      = parseFloat(el('settingLat')?.value) || -6.285;
  s.campusLng      = parseFloat(el('settingLng')?.value) || 107.1706;
  s.campusRadius   = parseInt(el('settingRadius')?.value) || 75;
  s.autoCheckout   = el('settingAutoCheckout')?.checked !== false;
  s.maxGpsAccuracy = parseInt(el('settingMaxAccuracy')?.value) || 150;
  saveSettings(s);
  if (el('adminQrDisplay')) el('adminQrDisplay').textContent = s.qrCode;
  const session = getSession();
  addAuditLog('settings', session?.name || 'Admin', `Updated check-in validation: mode=${s.validationMode}, radius=${s.campusRadius}m, autoCheckout=${s.autoCheckout}`, 'settings');
  showToast('✓ Validation settings saved');
});

// Notification toggles
document.querySelectorAll('.toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const on = btn.classList.toggle('on');
    btn.setAttribute('aria-pressed', on.toString());
    const s = getSettings();
    const id = btn.id;
    if (id === 'lecturerAutoTrackingToggle') {
      ls_set('autoTrackingEnabled', on);
      if (on) {
        showToast('Auto Check-In Enabled (Active 6AM - 8PM, Every 15 mins)', 'success');
        const h = new Date().getHours();
        if (h >= 6 && h < 20) gpsAutoCheckin();
        if (!_gpsAutoCheckinIntervalId) {
          _gpsAutoCheckinIntervalId = setInterval(() => {
            const currentH = new Date().getHours();
            if (currentH >= 6 && currentH < 20) gpsAutoCheckin();
          }, 900000);
        }
      } else {
        showToast('Background Auto Check-In Disabled', 'warning');
        if (_gpsAutoCheckinIntervalId) {
          clearInterval(_gpsAutoCheckinIntervalId);
          _gpsAutoCheckinIntervalId = null;
        }
      }
      return;
    }
    if (id === 'toggleLateAlert')    s.notifyLate    = on;
    if (id === 'toggleAbsenceAlert') s.notifyAbsent  = on;
    if (id === 'toggleLeaveAlert')   s.notifyLeave   = on;
    if (id === 'toggleWeekend')      s.notifyWeekend = on;
    saveSettings(s);
  });
});

document.getElementById('clearDataBtn').addEventListener('click', () => {
  if (!confirm('Clear all stored data? This will rebuild the demo dataset.')) return;
  Object.values(KEYS).forEach(k => { try { localStorage.removeItem(k); } catch {} });
  initDatabase();
  showToast('✓ Data cleared and rebuilt');
  updateDashboard(); applyAdminFilters(); renderAdminQuickStats(); renderActivityFeed();
});

document.getElementById('rebuildDataBtn')?.addEventListener('click', () => {
  ls_remove(KEYS.attendanceRecs);
  ls_remove(KEYS.lecturers);
  initDatabase();
  showToast('✓ Demo dataset rebuilt');
  updateDashboard(); applyAdminFilters(); renderAdminQuickStats();
});

// ===================================================
//  ADMIN: MODALS
// ===================================================
function openRecordModal(record) {
  document.getElementById('modalTitleEl').textContent = record.name;
  document.getElementById('modalSubtitle').textContent = `${record.dept} · ${record.id}`;

  const statusColors = {
    'Present':    { bg: 'var(--success-bg)', txt: 'var(--success)' },
    'Late':       { bg: 'var(--warning-bg)', txt: 'var(--warning)' },
    'Absent':     { bg: 'var(--danger-bg)',  txt: 'var(--danger)' },
    'Leave':      { bg: '#f3e8ff',           txt: '#7c3aed' },
    'Online':     { bg: '#e0f2fe',           txt: '#0891b2' },
    'Reschedule': { bg: '#fef3c7',           txt: '#d97706' }
  };
  const colors = statusColors[record.status] || { bg: 'var(--bg)', txt: 'var(--text)' };
  const scheduled = record.schedTime || '08:00–17:00';

  document.getElementById('modalBody').innerHTML = `
    <div style="padding:12px;background:${colors.bg};border-radius:8px;margin-bottom:16px;">
      <div style="font-size:11px;color:${colors.txt};opacity:.7;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Current Status</div>
      <div style="font-size:18px;font-weight:700;color:${colors.txt};">${escHtml(record.status)}</div>
    </div>
    <div class="modal-grid">
      <div class="modal-field"><label>Date</label><span>${fmtDate(record.date)}</span></div>
      <div class="modal-field"><label>Day of Week</label><span>${fmtDay(record.date)}</span></div>
      <div class="modal-field"><label>Staff ID</label><span class="mono">${escHtml(record.id)}</span></div>
      <div class="modal-field"><label>Department</label><span>${escHtml(record.dept)}</span></div>
    </div>
    <div style="padding:12px;background:var(--bg);border-radius:8px;margin:16px 0;">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;"><strong>Work Schedule</strong></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div><div style="font-size:11px;color:var(--text-muted);margin-bottom:2px;">Expected</div><div style="font-weight:600;color:var(--text);">${scheduled}</div></div>
        <div><div style="font-size:11px;color:var(--text-muted);margin-bottom:2px;">Duration</div><div style="font-weight:600;color:var(--text);">${record.duration || '8 hours'}</div></div>
      </div>
    </div>
    <div class="modal-grid">
      <div class="modal-field"><label>Check In</label><span class="mono" style="font-size:16px;font-weight:600;color:${record.checkIn ? 'var(--success)' : 'var(--text-muted)'};">${record.checkIn || '—'}</span></div>
      <div class="modal-field"><label>Check Out</label><span class="mono" style="font-size:16px;font-weight:600;color:${record.checkOut ? 'var(--success)' : 'var(--text-muted)'};">${record.checkOut || '—'}</span></div>
    </div>
    ${record.gpsLat != null ? `
    <div style="margin-top:16px;padding:12px 14px;background:var(--success-bg);border:1px solid var(--success);border-radius:8px;display:flex;gap:10px;align-items:center;">
      <span style="font-size:18px;">📍</span>
      <div style="flex:1;">
        <div style="font-size:12px;font-weight:600;color:var(--success);margin-bottom:4px;">GPS Verified Check-In</div>
        <div style="font-size:12px;color:var(--text-muted);">Distance from campus: <strong>${record.gpsDistance}m</strong> · Coords: ${record.gpsLat.toFixed(5)}, ${record.gpsLng.toFixed(5)}</div>
      </div>
    </div>` : ''}
    ${record.reason ? `
    <div style="padding:12px;background:var(--border);border-radius:8px;border-left:3px solid ${colors.txt};margin-top:16px;">
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;"><strong>Note/Reason</strong></div>
      <div style="font-size:13px;color:var(--text);">${escHtml(record.reason)}</div>
    </div>` : ''}
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
      <button class="export-btn" onclick="closeModal()">Close</button>
    </div>`;
  document.getElementById('modalBackdrop').classList.add('active');
  document.getElementById('modalCloseBtn').focus();
}



function openLecturerModal(lec) {
  const stats = getLecturerDetailStats(lec.id);
  document.getElementById('modalTitleEl').textContent = lec.name;
  document.getElementById('modalSubtitle').textContent = `${lec.dept} · ${lec.id}`;
  
  const deptColor = DEPT_COLORS[lec.dept] || '#1D4ED8';
  
  document.getElementById('modalBody').innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;padding:12px;background:linear-gradient(135deg,${deptColor}15 0%,${deptColor}05 100%);border-radius:8px;margin-bottom:16px;">
      <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,${deptColor} 0%,${deptColor}cc 100%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;flex-shrink:0;">${lec.initials}</div>
      <div>
        <div style="font-size:14px;color:var(--text-muted);">${escHtml(lec.dept)}</div>
        <div style="font-weight:600;color:var(--text);">${escHtml(lec.email || 'N/A')}</div>
      </div>
    </div>
    
    <div style="margin-bottom:20px;">
      <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;"><strong>30-Day Summary</strong></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
        <div style="padding:12px;background:var(--success-bg);border-radius:8px;text-align:center;">
          <div style="font-size:20px;font-weight:700;color:var(--success);">${stats.presentDays}</div>
          <div style="font-size:11px;color:var(--success);margin-top:4px;">Present</div>
        </div>
        <div style="padding:12px;background:var(--warning-bg);border-radius:8px;text-align:center;">
          <div style="font-size:20px;font-weight:700;color:var(--warning);">${stats.lateDays}</div>
          <div style="font-size:11px;color:var(--warning);margin-top:4px;">Late</div>
        </div>
        <div style="padding:12px;background:var(--danger-bg);border-radius:8px;text-align:center;">
          <div style="font-size:20px;font-weight:700;color:var(--danger);">${stats.absentDays}</div>
          <div style="font-size:11px;color:var(--danger);margin-top:4px;">Absent</div>
        </div>
      </div>
    </div>
    
    <div class="modal-grid" style="gap:12px;">
      <div style="padding:12px;background:var(--bg);border-radius:8px;border-left:4px solid var(--blue);">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Attendance Rate</div>
        <div style="font-size:24px;font-weight:700;color:var(--text);">${stats.attendanceRate}%</div>
      </div>
      <div style="padding:12px;background:var(--bg);border-radius:8px;border-left:4px solid #7c3aed;">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Pending Requests</div>
        <div style="font-size:24px;font-weight:700;color:var(--text);">${stats.pendingRequests}</div>
      </div>
    </div>
    
    <div class="modal-grid" style="margin-top:12px;gap:12px;">
      <div style="padding:12px;background:var(--bg);border-radius:8px;">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Total Days Recorded</div>
        <div style="font-size:18px;font-weight:700;color:var(--text);">${stats.totalDays}</div>
      </div>
      <div style="padding:12px;background:var(--bg);border-radius:8px;">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Approved Requests</div>
        <div style="font-size:18px;font-weight:700;color:var(--text);">${stats.approvedRequests}</div>
      </div>
    </div>
    
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
      <button class="export-btn" onclick="closeModal()">Close</button>
    </div>`;
  document.getElementById('modalBackdrop').classList.add('active');
  document.getElementById('modalCloseBtn').focus();
}

function closeModal() { document.getElementById('modalBackdrop').classList.remove('active'); }
document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
document.getElementById('modalBackdrop').addEventListener('click', e => { if (e.target === document.getElementById('modalBackdrop')) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    document.getElementById('forgotBackdrop').classList.remove('active');
    closeCheckinValidation();
    closeLeaveModal();
    closeNotifPanel();
  }
});

// ===================================================
//  STUDENT: DATA
// ===================================================
const STUDENT_SUBJECTS = [
  { code:'CS301', name:'Data Structures',     lecturer:'Dr. Hafizuddin Zain',       credits:3 },
  { code:'CS302', name:'Operating Systems',   lecturer:'Prof. Azri Nizam',           credits:3 },
  { code:'CS303', name:'Web Technologies',    lecturer:'Dr. Nadia Aziz',             credits:3 },
  { code:'CS304', name:'Database Systems',    lecturer:'Assoc. Prof. Omar Khalid',   credits:3 },
  { code:'CS305', name:'Software Engineering',lecturer:'Dr. Suraya Kamal',           credits:3 },
];

// Lecturer IDs mapped to subject codes (for checking their status)
const SUBJECT_LECTURER_MAP = {
  'CS301': 'CE-2041', 'CS302': 'CS-0002', 'CS303': 'CS-0003', 'CS304': 'CS-0004', 'CS305': 'CS-0005'
};

const TIMETABLE = [
  { day:1, time:'08:00', endTime:'10:00', code:'CS301', room:'Lab A-203' },
  { day:2, time:'10:00', endTime:'12:00', code:'CS302', room:'Block B-101' },
  { day:3, time:'08:00', endTime:'10:00', code:'CS303', room:'Lab C-105' },
  { day:3, time:'14:00', endTime:'16:00', code:'CS304', room:'Block B-202' },
  { day:4, time:'10:00', endTime:'12:00', code:'CS305', room:'Lab A-301' },
  { day:5, time:'08:00', endTime:'10:00', code:'CS301', room:'Lab A-203' },
  { day:5, time:'14:00', endTime:'16:00', code:'CS303', room:'Lab C-105' },
];

const STU_HISTORY = [
  { date:'2025-04-09', code:'CS301', status:'Present' },
  { date:'2025-04-08', code:'CS302', status:'Present' },
  { date:'2025-04-07', code:'CS303', status:'Absent'  },
  { date:'2025-04-07', code:'CS304', status:'Present' },
  { date:'2025-04-04', code:'CS305', status:'Late'    },
  { date:'2025-04-04', code:'CS301', status:'Present' },
  { date:'2025-04-03', code:'CS302', status:'Present' },
  { date:'2025-04-02', code:'CS303', status:'Present' },
  { date:'2025-04-01', code:'CS304', status:'Present' },
  { date:'2025-03-31', code:'CS305', status:'Present' },
  { date:'2025-03-28', code:'CS301', status:'Absent'  },
  { date:'2025-03-27', code:'CS302', status:'Present' },
  { date:'2025-03-26', code:'CS303', status:'Late'    },
  { date:'2025-03-25', code:'CS304', status:'Present' },
  { date:'2025-03-24', code:'CS305', status:'Present' },
];

// ===================================================
//  STUDENT: LIVE CLASS STATUS CALCULATION
// ===================================================
function calcClassStatus(slot, nowMins, settings) {
  const [sh, sm] = slot.time.split(':').map(Number);
  const [eh, em] = slot.endTime.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins   = eh * 60 + em;
  const lateThresh = startMins + (settings.lateThreshold || 15);
  const absentThresh = startMins + (settings.absentThreshold || 30);

  // Check for an approved leave request for this subject's lecturer
  const leaveRequests = getLeaveRequests();
  const today = new Date().toISOString().split('T')[0];
  const lecId = SUBJECT_LECTURER_MAP[slot.code];
  const approvedLeave = leaveRequests.find(r =>
    r.status === 'Approved' &&
    r.date === today &&
    (r.lecturerId === lecId || r.classCode === slot.code)
  );
  if (approvedLeave) {
    if (approvedLeave.type === 'Online')      return { label: 'Online Class', cls: 'cls-online' };
    if (approvedLeave.type === 'Absent')      return { label: 'Cancelled',    cls: 'cls-cancelled' };
    if (approvedLeave.type === 'Reschedule')  return { label: 'Rescheduled',  cls: 'cls-reschedule' };
    return { label: 'Leave',    cls: 'cls-leave' };
  }
  // Check pending leave
  const pendingLeave = leaveRequests.find(r =>
    r.status === 'Pending' &&
    r.date === today &&
    (r.lecturerId === lecId || r.classCode === slot.code)
  );
  if (pendingLeave) return { label: 'Pending Review', cls: 'cls-pending' };

  // Check attendance record for main demo lecturer
  if (lecId === 'CE-2041') {
    const lecState = getLecturerState();
    if (lecState.status === 'in' || lecState.status === 'done') {
      if (nowMins < startMins) return { label: 'Upcoming', cls: 'cls-pending' };
      if (nowMins >= endMins) return { label: 'Present', cls: 'cls-present' };
      return { label: 'Ongoing', cls: 'cls-present' };
    } else {
      if (nowMins < startMins) return { label: 'Upcoming', cls: 'cls-pending' };
      if (nowMins < lateThresh) return { label: 'Not Checked In', cls: 'cls-pending' };
      if (nowMins < absentThresh) return { label: 'Late Check-In Expected', cls: 'cls-late' };
      return { label: 'Absent', cls: 'cls-absent' };
    }
  }

  // Generic time-based status
  if (nowMins < startMins) return { label: 'Upcoming', cls: 'cls-pending' };
  if (nowMins >= endMins)  return { label: 'Present',  cls: 'cls-present' };
  return { label: 'Ongoing', cls: 'cls-present' };
}

// ===================================================
//  STUDENT: RENDER DASHBOARD
// ===================================================
function renderStudentDashboard() {
  const now = new Date();
  const total   = STU_HISTORY.length;
  const present = STU_HISTORY.filter(r=>r.status==='Present').length;
  const rate    = total ? Math.round((present/total)*100) : 0;

  const el = id => document.getElementById(id);
  if (el('stuWelTotal'))   el('stuWelTotal').textContent   = total;
  if (el('stuWelPresent')) el('stuWelPresent').textContent = present;
  if (el('stuWelRate'))    el('stuWelRate').textContent    = rate + '%';
  if (el('stuSumPresent')) el('stuSumPresent').textContent = present;
  if (el('stuSumAbsent'))  el('stuSumAbsent').textContent  = STU_HISTORY.filter(r=>r.status==='Absent').length;
  if (el('stuSumLate'))    el('stuSumLate').textContent    = STU_HISTORY.filter(r=>r.status==='Late').length;
  if (el('stuSumRate'))    el('stuSumRate').textContent    = rate + '%';

  const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
  if (el('stuDateStr')) el('stuDateStr').textContent = now.toLocaleDateString('en-MY', opts) + ' · Faculty of Computing';

  renderStudentTodaySchedule();
  const session = getSession();
  if (session) renderRecentNotifs(session.id);
}

function renderStudentTodaySchedule() {
  const now = new Date();
  const dayIdx = now.getDay();
  const todaySlots = TIMETABLE.filter(s => s.day === dayIdx);
  const countEl = document.getElementById('stuTodayCount');
  const container = document.getElementById('stuTodaySchedule');
  const settings = getSettings();
  if (countEl) countEl.textContent = todaySlots.length + ' classes today';
  if (!container) return;
  if (!todaySlots.length) {
    container.innerHTML = `<div class="empty-state visible"><div class="empty-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div><h4>No classes today</h4><p>Enjoy your free day! Check the Schedule tab for the full week.</p></div>`;
    return;
  }
  const nowMins = now.getHours() * 60 + now.getMinutes();
  container.innerHTML = `<div class="schedule-grid">` + todaySlots.map((slot, idx) => {
    const subj = STUDENT_SUBJECTS.find(s => s.code === slot.code) || {};
    const { label, cls } = calcClassStatus(slot, nowMins, settings);
    return `<div class="schedule-slot-clickable status-${cls.replace('cls-','')} schedule-slot" data-index="${idx}" data-subject="${escHtml(subj.name || slot.code)}" data-code="${slot.code}" data-time="${slot.time}" data-endtime="${slot.endTime}" data-lecturer="${escHtml(subj.lecturer || '—')}" data-room="${slot.room}">
      <div class="slot-time">${slot.time}–${slot.endTime}</div>
      <div class="slot-subject">${escHtml(subj.name || slot.code)}</div>
      <div class="slot-lecturer">${escHtml(subj.lecturer || '—')}</div>
      <div class="slot-meta">
        <div class="slot-room">
          <svg viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M4 5h4M4 7.5h2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
          ${escHtml(slot.room)}
        </div>
        <span class="chip ${cls}">${escHtml(label)}</span>
      </div>
    </div>`;
  }).join('') + `</div>`;
  
  // Attach click listeners to schedule items
  container.querySelectorAll('.schedule-slot-clickable').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.index);
      const slot = todaySlots[idx];
      const subj = STUDENT_SUBJECTS.find(s => s.code === slot.code) || {};
      showScheduleDetail(slot, subj);
    });
  });
}

// ===================================================
//  STUDENT: WEEKLY TABLE
// ===================================================

function showScheduleDetail(slot, subj) {
  const modalBody = document.getElementById('modalBody');
  const modalTitle = document.getElementById('modalTitleEl');
  const backdrop = document.getElementById('modalBackdrop');
  
  if (!modalBody || !backdrop) return;
  
  // Get attendance record for this class
  const recs = getRecords();
  const session = getSession();
  const rec = recs.find(r => r.studentId === session?.id && r.code === slot.code);
  const status = rec?.status || 'Not attended';
  const timeIn = rec?.checkInTime ? rec.checkInTime.split(' ')[1] : '—';
  
  modalTitle.textContent = escHtml(subj.name || slot.code);
  
  modalBody.innerHTML = `
    <div class="modal-grid">
      <div class="modal-field">
        <label>Subject Code</label>
        <span class="mono">${escHtml(slot.code)}</span>
      </div>
      <div class="modal-field">
        <label>Credits</label>
        <span>${subj.credits || '—'}</span>
      </div>
    </div>
    
    <div class="modal-grid">
      <div class="modal-field">
        <label>instructor</label>
        <span>${escHtml(subj.lecturer || '—')}</span>
      </div>
      <div class="modal-field">
        <label>Time</label>
        <span>${slot.time}–${slot.endTime}</span>
      </div>
    </div>
    
    <div class="modal-grid">
      <div class="modal-field">
        <label>Room / Location</label>
        <span>${escHtml(slot.room)}</span>
      </div>
      <div class="modal-field">
        <label>Your Status</label>
        <span style="display:inline-block;padding:4px 8px;border-radius:4px;background:${status === 'Present' ? 'var(--success-bg)' : status === 'Late' ? 'var(--warning-bg)' : 'var(--danger-bg)'};color:${status === 'Present' ? 'var(--success)' : status === 'Late' ? 'var(--warning)' : 'var(--danger)'};font-weight:500;font-size:12px;">${status}</span>
      </div>
    </div>
    
    ${rec ? `
      <div style="margin-top:16px;padding:12px;background:var(--bg);border-radius:8px;border-left:3px solid var(--blue);">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Check-in Time</div>
        <div style="font-weight:600;color:var(--text);">${timeIn}</div>
      </div>
    ` : `
      <div style="margin-top:16px;padding:12px;background:var(--danger-bg);border-radius:8px;border-left:3px solid var(--danger);">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">No attendance record</div>
        <div style="color:var(--danger);font-size:13px;">You haven't checked in for this class yet.</div>
      </div>
    `}
    
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);font-size:12px;color:var(--text-muted);">
      <div style="margin-bottom:8px;"><strong>Description:</strong></div>
      <p style="line-height:1.5;">${escHtml(subj.description || 'No description available')}</p>
    </div>
  `;
  
  backdrop.classList.add('active');
}
function renderStudentWeekTable() {
  const tbody = document.getElementById('stuWeekTable');
  if (!tbody) return;
  const TIME_SLOTS = [
    { time:'08:00', endTime:'10:00' },
    { time:'10:00', endTime:'12:00' },
    { time:'14:00', endTime:'16:00' },
  ];
  const DAYS = [1,2,3,4,5];
  tbody.innerHTML = TIME_SLOTS.map(ts => {
    const cells = DAYS.map(day => {
      const slot = TIMETABLE.find(s => s.day === day && s.time === ts.time);
      if (!slot) return `<td style="padding:8px;"><span style="color:var(--text-faint);font-size:12px;">—</span></td>`;
      const subj = STUDENT_SUBJECTS.find(s => s.code === slot.code) || {};
      return `<td style="padding:8px;vertical-align:top;">
        <div class="week-slot-cell">
          <div class="ws-subj">${escHtml(subj.name || slot.code)}</div>
          <div class="ws-room">${escHtml(slot.room)}</div>
        </div>
      </td>`;
    }).join('');
    return `<tr>
      <td class="time-label" style="padding:12px 16px;white-space:nowrap;">${ts.time}–${ts.endTime}</td>
      ${cells}
    </tr>`;
  }).join('');
}

// ===================================================
//  STUDENT: HISTORY TABLE
// ===================================================
function renderStudentHistory() {
  const tbody = document.getElementById('stuHistoryBody');
  if (!tbody) return;
  const records = getRecords();
  const leaveRequests = getLeaveRequests();
  tbody.innerHTML = STU_HISTORY.map(r => {
    const subj = STUDENT_SUBJECTS.find(s => s.code === r.code);
    const d = new Date(r.date + 'T00:00:00');
    const lecId = SUBJECT_LECTURER_MAP[r.code];
    const lecRec = records.find(rec => rec.id === lecId && rec.date === r.date);
    const lr = leaveRequests.find(l => l.lecturerId === lecId && l.date === r.date && l.status === 'Approved');
    let lecStatus = lecRec ? lecRec.status : (lr ? lr.type : 'Unknown');
    const lecChipCls = lecStatus === 'Present' ? 'present' : lecStatus === 'Late' ? 'late' : lecStatus === 'Absent' ? 'absent' : 'leave';
    const stuChipCls = r.status === 'Present' ? 'stu-present' : r.status === 'Absent' ? 'stu-absent' : 'stu-late';
    return `<tr>
      <td class="mono">${d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</td>
      <td><strong style="font-weight:500">${subj ? escHtml(subj.name) : r.code}</strong></td>
      <td style="font-size:13px;color:var(--text-muted);">${subj ? escHtml(subj.lecturer) : '—'}</td>
      <td class="mono">${TIMETABLE.find(s=>s.code===r.code)?.time || '—'}</td>
      <td>${chipHtml(lecStatus)}</td>
    </tr>`;
  }).join('');
}

// ===================================================
//  STUDENT: SUBJECT PROGRESS
// ===================================================
function renderStudentSubjectProgress() {
  const container = document.getElementById('stuSubjectProgress');
  if (!container) return;
  container.innerHTML = STUDENT_SUBJECTS.map(subj => {
    const recs = STU_HISTORY.filter(r => r.code === subj.code);
    const present = recs.filter(r => r.status === 'Present').length;
    const total = recs.length || 1;
    const pct = Math.round((present / total) * 100);
    const cls = pct >= 80 ? 'pf-success' : pct >= 60 ? 'pf-warning' : 'pf-danger';
    return `<div style="margin-bottom:18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <div>
          <span style="font-size:14px;font-weight:500;">${escHtml(subj.name)}</span>
          <span style="font-size:12px;color:var(--text-faint);margin-left:8px;">${subj.code}</span>
        </div>
        <span style="font-size:13px;font-weight:600;color:${pct>=80?'var(--success)':pct>=60?'var(--warning)':'var(--danger)'};">${pct}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${pct}%"></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:4px;">
        <span style="font-size:11px;color:var(--text-faint);">${present} attended / ${total} total</span>
        <span style="font-size:11px;color:var(--text-faint);">${escHtml(subj.lecturer)}</span>
      </div>
    </div>`;
  }).join('');
}

// ===================================================
//  STUDENT: TAB SWITCHER
// ===================================================
function switchStudentTab(tab) {
  document.querySelectorAll('#studentView .nav-link[data-stutab]').forEach(l => l.classList.toggle('active', l.dataset.stutab === tab));
  document.querySelectorAll('.stu-page').forEach(p => p.classList.toggle('active', p.id === 'stutab-' + tab));
  if (tab === 'schedule') { renderStudentWeekTable(); renderStudentHistory(); }
  if (tab === 'profile')  { renderStudentSubjectProgress(); }
}

document.querySelectorAll('#studentView .nav-link[data-stutab]').forEach(btn => {
  btn.addEventListener('click', () => switchStudentTab(btn.dataset.stutab));
});

// ===================================================
//  STUDENT: NOTIFICATIONS
// ===================================================
function updateNotifEnableButton() {
  const btn = document.getElementById('enableNotifBtn');
  const label = document.getElementById('notifStatusLabel');
  if (!btn) return;
  btn.textContent = '✓ Notifications Enabled';
  btn.disabled = true;
  btn.style.opacity = '.7';
  if (label) label.textContent = '✓ Active';
}

document.getElementById('enableNotifBtn')?.addEventListener('click', requestNotificationPermission);

document.getElementById('stuNotifBtn')?.addEventListener('click', () => {
  openNotifPanel();
  const session = getSession();
  if (session) renderNotifPanel(session.id);
});
document.getElementById('notifPanelClose')?.addEventListener('click', closeNotifPanel);
document.getElementById('notifPanelBackdrop')?.addEventListener('click', closeNotifPanel);
document.getElementById('markAllReadBtn')?.addEventListener('click', () => {
  const session = getSession();
  if (session) markAllNotifsRead(session.id);
});
document.getElementById('viewAllNotifsBtn')?.addEventListener('click', openNotifPanel);

function getLeaveStatus(lecturerId, classCode, date) {
  const requests = getLeaveRequests();
  const leave = requests.find(r => 
    r.lecturerId === lecturerId && 
    r.classCode === classCode && 
    r.date === date && 
    r.status === 'Approved'
  );
  return leave ? { hasLeave: true, type: leave.type, reason: leave.reason } : { hasLeave: false };
}

// ===================================================
//  MANAGE LEAVE REQUESTS & SYNC DATABASE
// ===================================================
//  RIPPLE EFFECT
// ===================================================
function addRipple(e) {
  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;
  const ripple = document.createElement('span');
  ripple.classList.add('btn-ripple');
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}
document.querySelectorAll('.checkin-btn, .login-btn, .save-btn, .stu-edit-btn').forEach(btn => {
  btn.addEventListener('click', addRipple);
});

// ===================================================
//  PWA: SERVICE WORKER REGISTRATION
// ===================================================
async function initPWA() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('service-worker.js');
    } catch (e) { /* SW not critical */ }
  }
}

// ===================================================
//  BOOT
// ===================================================
(function boot() {
  // 1. Init structured database
  initDatabase();

  // 2. Ensure absence records for demo presentation
  ensureAbsenceRecords();

  // 3. Force light mode (always)
  document.documentElement.setAttribute('data-theme', 'light');

  // 4. Default date filters
  setDefaultDateFilters();

  // 5. Register PWA service worker
  initPWA();

  // 6. Add some demo notifications for student
  const stuNotifs = getStudentNotifications('STU-0001');
  if (stuNotifs.length === 0) {
    // Seed demo notifications
    addNotification('STU-0001', { title: 'Class Alert: Late Arrival', body: 'Dr. Hafizuddin Zain will be late for CS301 today. Class starts at 08:15.', type: 'warning', icon: '🕐' });
    addNotification('STU-0001', { title: 'Schedule Change: Web Technologies', body: 'CS303 on Wednesday has been moved online. Check your email for the link.', type: 'info', icon: '💻' });
    addNotification('STU-0001', { title: 'Attendance Reminder', body: 'Your attendance rate has dropped below 80% in Operating Systems. Please attend upcoming classes.', type: 'danger', icon: '⚠️' });
  }

  // 7. Restore session or show login
  restoreSession();

  // 8. Auto-refresh check-in button state every minute (schedule-aware)
  setInterval(() => {
    const session = getSession();
    if (session && session.role === 'lecturer') renderLecturerStatus();
  }, 60000);
})()