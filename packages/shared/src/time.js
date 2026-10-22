// packages/shared/src/time.js
// Pengendalian kebijakan waktu akses berbasis zona waktu (NIST SP 800-207 Policy Rule)

let mockTimeOverride = null;

/**
 * Mengatur waktu mock untuk keperluan automated testing
 * @param {Date|string|null} time
 */
export function setMockTime(time) {
  mockTimeOverride = time ? new Date(time) : null;
}

/**
 * Menghapus mock time
 */
export function clearMockTime() {
  mockTimeOverride = null;
}

/**
 * Memeriksa apakah waktu saat ini berada di dalam rentang jam akses yang diizinkan.
 * Default: 07:00 - 21:00 WIB (Asia/Jakarta)
 * @param {Date|null} customDate - Waktu spesifik untuk pengujian
 * @returns {{ allowed: boolean, currentTime: string, window: string, timezone: string }}
 */
export function isWithinAccessHours(customDate = null) {
  const timezone = process.env.APP_TIMEZONE || 'Asia/Jakarta';
  const startConfig = process.env.GRADE_EDIT_START || '07:00';
  const endConfig = process.env.GRADE_EDIT_END || '21:00';

  const dateToUse = customDate || mockTimeOverride || new Date();

  // Konversi waktu ke zona waktu target (mis. Asia/Jakarta)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const parts = formatter.formatToParts(dateToUse);
  const hourPart = parts.find((p) => p.type === 'hour')?.value || '00';
  const minutePart = parts.find((p) => p.type === 'minute')?.value || '00';
  const currentTime = `${hourPart}:${minutePart}`;

  // Periksa apakah currentTime berada di antara startConfig dan endConfig
  const isAllowed = currentTime >= startConfig && currentTime <= endConfig;

  return {
    allowed: isAllowed,
    currentTime,
    window: `${startConfig} - ${endConfig}`,
    timezone
  };
}
