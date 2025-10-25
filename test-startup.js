// Simple test to verify API can start
const { spawn } = require('child_process');
const path = require('path');

console.log('Testing API startup...');

// Set environment variables
process.env.DISABLE_PRISMA = 'true';
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/ntsamaela';
process.env.PORT = '3003';
process.env.NODE_ENV = 'development';

// Start the API server
const apiProcess = spawn('node', ['dist/index.js'], {
  cwd: path.join(__dirname, 'apps/api'),
  stdio: 'pipe',
  env: { ...process.env }
});

let output = '';
let hasStarted = false;

apiProcess.stdout.on('data', (data) => {
  output += data.toString();
  console.log('API Output:', data.toString().trim());
  
  if (data.toString().includes('Server running on port') && !hasStarted) {
    hasStarted = true;
    console.log('✅ API started successfully!');
    
    // Test the health endpoint
    setTimeout(() => {
      const http = require('http');
      const req = http.request({
        hostname: 'localhost',
        port: 3003,
        path: '/health',
        method: 'GET'
      }, (res) => {
        console.log(`✅ Health check: ${res.statusCode}`);
        apiProcess.kill();
        process.exit(0);
      });
      
      req.on('error', (err) => {
        console.log('❌ Health check failed:', err.message);
        apiProcess.kill();
        process.exit(1);
      });
      
      req.end();
    }, 2000);
  }
});

apiProcess.stderr.on('data', (data) => {
  console.log('API Error:', data.toString().trim());
});

apiProcess.on('close', (code) => {
  if (!hasStarted) {
    console.log('❌ API failed to start. Exit code:', code);
    console.log('Full output:', output);
    process.exit(1);
  }
});

// Timeout after 10 seconds
setTimeout(() => {
  if (!hasStarted) {
    console.log('❌ API startup timed out');
    apiProcess.kill();
    process.exit(1);
  }
}, 10000);




