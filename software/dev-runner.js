const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\x1b[36m%s\x1b[0m', '=== Starting Next.js Frontend and FastAPI Backend ===');

const isWindows = process.platform === 'win32';

// 1. Determine Python path from virtual environment
const venvPythonPath = isWindows
  ? path.join(__dirname, 'backend', '.venv', 'Scripts', 'python.exe')
  : path.join(__dirname, 'backend', '.venv', 'bin', 'python');

let pythonCmd = 'python';
if (fs.existsSync(venvPythonPath)) {
  pythonCmd = venvPythonPath;
  console.log(`Using Python from virtual environment: ${pythonCmd}`);
} else {
  console.log('Virtual environment Python not found. Falling back to system "python" (make sure uvicorn is installed globally or in your active environment).');
}

// 2. Start FastAPI Backend
console.log('Starting backend server on port 8000...');
const backendProcess = spawn(
  pythonCmd,
  ['-m', 'uvicorn', 'main:app', '--reload', '--port', '8000'],
  {
    cwd: path.join(__dirname, 'backend'),
    shell: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      PYTHONPATH: __dirname
    }
  }
);

// 3. Start Next.js Frontend
console.log('Starting frontend development server...');
const frontendProcess = spawn(
  isWindows ? 'npm.cmd' : 'npm',
  ['run', 'dev:frontend'],
  {
    cwd: __dirname,
    shell: true,
    stdio: 'inherit'
  }
);

// 4. Handle exit clean up (prevent orphaned processes)
let exiting = false;
const cleanExit = (signal) => {
  if (exiting) return;
  exiting = true;
  console.log(`\n\x1b[33mReceived request to stop. Stopping both servers...\x1b[0m`);
  
  // Kill backend process tree
  try {
    if (backendProcess && backendProcess.pid) {
      if (isWindows) {
        spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
      } else {
        backendProcess.kill('SIGTERM');
      }
    }
  } catch (e) {
    // Ignore error
  }
  
  // Kill frontend process tree
  try {
    if (frontendProcess && frontendProcess.pid) {
      if (isWindows) {
        spawn('taskkill', ['/pid', frontendProcess.pid, '/f', '/t']);
      } else {
        frontendProcess.kill('SIGTERM');
      }
    }
  } catch (e) {
    // Ignore error
  }

  setTimeout(() => {
    process.exit(0);
  }, 800);
};

// Catch termination signals
process.on('SIGINT', () => cleanExit('SIGINT'));
process.on('SIGTERM', () => cleanExit('SIGTERM'));

// If one process exits unexpectedly, terminate the other
backendProcess.on('exit', (code) => {
  if (!exiting) {
    console.log(`Backend process exited with code ${code}`);
    cleanExit('backend exit');
  }
});

frontendProcess.on('exit', (code) => {
  if (!exiting) {
    console.log(`Frontend process exited with code ${code}`);
    cleanExit('frontend exit');
  }
});
