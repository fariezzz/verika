// scripts/start-all-services.js
// Menjalankan ketiga service backend (Gateway, Nilai, Transkrip) secara bersamaan

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const services = [
  { name: 'GATEWAY (Port 3000)', file: 'packages/gateway/src/server.js', color: '\x1b[32m' },
  { name: 'SVC NILAI (Port 3001)', file: 'packages/service-nilai/src/server.js', color: '\x1b[36m' },
  { name: 'SVC TRANSKRIP (Port 3002)', file: 'packages/service-transkrip/src/server.js', color: '\x1b[35m' }
];

console.log('\x1b[1m=== MEMULAI BACKEND SISTEM NILAI ZERO TRUST ===\x1b[0m\n');

const runningProcesses = [];

for (const svc of services) {
  const proc = spawn('node', [svc.file], {
    cwd: rootDir,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development' }
  });

  proc.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line) => {
      console.log(`${svc.color}[${svc.name}]\x1b[0m ${line}`);
    });
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line) => {
      console.error(`${svc.color}[${svc.name} ERROR]\x1b[0m ${line}`);
    });
  });

  proc.on('close', (code) => {
    console.log(`${svc.color}[${svc.name}]\x1b[0m Berhenti dengan exit code ${code}`);
  });

  runningProcesses.push(proc);
}

// Tangani sinyal terminate
const cleanup = () => {
  console.log('\n\x1b[33mMenghentikan seluruh service backend...\x1b[0m');
  runningProcesses.forEach((p) => p.kill('SIGINT'));
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
