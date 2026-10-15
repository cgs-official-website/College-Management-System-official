import { execSync } from 'child_process';
import fs from 'fs';

const PORT = process.argv[2] || process.env.PORT || 5000;
const system32 = `${process.env.SystemRoot || 'C:\\Windows'}\\System32`;
const netstatBin = fs.existsSync(`${system32}\\netstat.exe`) ? `"${system32}\\netstat.exe"` : 'netstat';
const findstrBin = fs.existsSync(`${system32}\\findstr.exe`) ? `"${system32}\\findstr.exe"` : 'findstr';
const taskkillBin = fs.existsSync(`${system32}\\taskkill.exe`) ? `"${system32}\\taskkill.exe"` : 'taskkill';
const execOptions = {
  encoding: 'utf8',
  env: { ...process.env, PATH: `${system32};${process.env.PATH || ''}` }
};

try {
  console.log(`Checking for processes listening on port ${PORT}...`);
  if (process.platform === 'win32') {
    let output = '';
    try {
      output = execSync(`${netstatBin} -ano | ${findstrBin} :${PORT}`, execOptions);
    } catch {
      // findstr exits with non-zero when no lines match
      output = '';
    }

    const lines = output.trim().split(/\r?\n/).filter(Boolean);
    const pids = new Set();
    for (const line of lines) {
      if (line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && pid !== String(process.pid)) {
          pids.add(pid);
        }
      }
    }

    if (pids.size === 0) {
      console.log(`✅ Port ${PORT} is already free (no listening process found).`);
    } else {
      for (const pid of pids) {
        try {
          execSync(`${taskkillBin} /F /PID ${pid}`, execOptions);
          console.log(`✅ Successfully terminated process PID ${pid} holding port ${PORT}.`);
        } catch (e) {
          console.error(`Failed to kill process PID ${pid}: ${e.message}`);
        }
      }
    }
  } else {
    try {
      execSync(`npx kill-port ${PORT}`, execOptions);
      console.log(`✅ Cleared port ${PORT}.`);
    } catch {
      console.log(`✅ Port ${PORT} is already free.`);
    }
  }
} catch (err) {
  console.error(`Error checking port ${PORT}:`, err.message);
}
