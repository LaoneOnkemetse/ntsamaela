// Test script to verify API startup
const { spawn } = require('child_process');
const path = require('path');

console.log('Testing API startup...');

// Set environment variables
process.env.DISABLE_PRISMA = 'true';
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/ntsamaela';
process.env.PORT = '3003';
process.env.NODE_ENV = 'development';

// Start the API server with a timeout
const apiProcess = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'apps/api'),
  stdio: 'pipe',
  env: { ...process.env },
  shell: true
});

let hasStarted = false;
let output = '';

apiProcess.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  console.log('API:', text.trim());
  
  if (text.includes('Server running on port') && !hasStarted) {
    hasStarted = true;
    console.log('✅ API started successfully!');
    
    // Test health endpoint
    setTimeout(() => {
      const http = require('http');
      const req = http.request({
        hostname: 'localhost',
        port: 3003,
        path: '/health',
        method: 'GET'
      }, (res) => {
        console.log(`✅ Health check: ${res.statusCode}`);
        apiProcess.kill('SIGTERM');
        setTimeout(() => {
          apiProcess.kill('SIGKILL');
          process.exit(0);
        }, 1000);
      });
      
      req.on('error', (err) => {
        console.log('❌ Health check failed:', err.message);
        apiProcess.kill('SIGTERM');
        setTimeout(() => {
          apiProcess.kill('SIGKILL');
          process.exit(1);
        }, 1000);
      });
      
      req.end();
    }, 3000);
  }
});

apiProcess.stderr.on('data', (data) => {
  const text = data.toString();
  output += text;
  console.log('API Error:', text.trim());
});

apiProcess.on('close', (code) => {
  if (!hasStarted) {
    console.log('❌ API failed to start. Exit code:', code);
    console.log('Full output:', output);
    process.exit(1);
  }
});

// Timeout after 15 seconds
setTimeout(() => {
  if (!hasStarted) {
    console.log('❌ API startup timed out');
    apiProcess.kill('SIGTERM');
    setTimeout(() => {
      apiProcess.kill('SIGKILL');
      process.exit(1);
    }, 1000);
  }
}, 15000);




