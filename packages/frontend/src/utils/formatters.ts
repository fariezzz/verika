// packages/frontend/src/utils/formatters.ts
// Format data akademik standar

/**
 * Format kode semester (misal: '20261' -> 'Semester Ganjil 2026/2027', '20252' -> 'Semester Genap 2025/2026')
 */
export function formatSemester(code: string): string {
  if (!code || typeof code !== 'string') return code || '-';

  const match = code.match(/^(\d{4})([12])$/);
  if (!match) return code;

  const year = parseInt(match[1], 10);
  const term = match[2];

  if (term === '1') {
    return `Semester Ganjil ${year}/${year + 1}`;
  } else if (term === '2') {
    return `Semester Genap ${year}/${year + 1}`;
  }

  return code;
}
