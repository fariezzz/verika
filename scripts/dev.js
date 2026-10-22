// scripts/dev.js
// Menjalankan backend dan frontend secara bersamaan untuk kenyamanan development

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\x1b[1;32m====================================================\x1b[0m');
console.log('\x1b[1;32m SISTEM NILAI AKADEMIK ZERO TRUST - UNSIL SINTESYS  \x1b[0m');
console.log('\x1b[1;32m====================================================\x1b[0m');
console.log('• Gateway (PEP):    http://localhost:3000');
console.log('• Service Nilai:    http://localhost:3001 (Internal only)');
console.log('• Service Transkrip:http://localhost:3002 (Internal only)');
console.log('• Frontend Web:     http://localhost:5173\n');

// 1. Jalankan backend services
const backend = spawn('node', ['scripts/start-all-services.js'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

// 2. Jalankan frontend Vite dev server
const frontend = spawn('npm', ['run', 'dev', '--workspace=@zero-trust/frontend'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

const cleanup = () => {
  console.log('\nMenghentikan seluruh proses dev...');
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
