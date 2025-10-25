// Simple test script to verify API functionality
const http = require('http');

// Test if API is running
function testAPI() {
  const options = {
    hostname: 'localhost',
    port: 3003,
    path: '/health',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`API Status: ${res.statusCode}`);
    if (res.statusCode === 200) {
      console.log('✅ API is running successfully on port 3003');
    } else {
      console.log('❌ API returned error status');
    }
  });

  req.on('error', (err) => {
    console.log('❌ API is not running or not accessible:', err.message);
  });

  req.setTimeout(5000, () => {
    console.log('❌ API request timed out');
    req.destroy();
  });

  req.end();
}

// Test if web admin is running
function testWebAdmin() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`Web Admin Status: ${res.statusCode}`);
    if (res.statusCode === 200) {
      console.log('✅ Web Admin is running successfully on port 3000');
    } else {
      console.log('❌ Web Admin returned error status');
    }
  });

  req.on('error', (err) => {
    console.log('❌ Web Admin is not running or not accessible:', err.message);
  });

  req.setTimeout(5000, () => {
    console.log('❌ Web Admin request timed out');
    req.destroy();
  });

  req.end();
}

console.log('Testing application services...');
testAPI();
setTimeout(testWebAdmin, 1000);




