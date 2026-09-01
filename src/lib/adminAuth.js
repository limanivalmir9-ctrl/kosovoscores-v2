// Master admin codes (only super admin knows both)
export const MASTER_CODES = ['260218', '022715'];

// Admin panel secret path segment
export const ADMIN_PATH = '/ks-panel-7k4m9';

export function checkMasterCode(code) {
  return MASTER_CODES.includes(code?.trim());
}

// Session helpers
export function getAdminSession() {
  try {
    const raw = sessionStorage.getItem('ks_admin_sess');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function setAdminSession(data) {
  sessionStorage.setItem('ks_admin_sess', JSON.stringify(data));
}

export function clearAdminSession() {
  sessionStorage.removeItem('ks_admin_sess');
}

// Check if current session is master admin
export function isMasterAdmin() {
  const s = getAdminSession();
  return s?.type === 'master';
}

// Check if current session has access to a section
export function hasAccess(section) {
  const s = getAdminSession();
  if (!s) return false;
  if (s.type === 'master') return true;
  return Array.isArray(s.allowed_sections) && s.allowed_sections.includes(section);
}

// Legacy compat
export function checkAdminCode(code) {
  return MASTER_CODES.includes(code?.trim());
}