// Test connection to the server
const testConnection = async () => {
  try {
    console.log('Testing connection to server...');
    
    const response = await fetch('http://localhost:3001/health');
    const data = await response.json();
    
    console.log('✅ Server is reachable!');
    console.log('Response:', data);
    
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    // Try alternative URLs
    const alternatives = [
      'http://127.0.0.1:3001/health',
      'http://192.168.1.116:3001/health',
      'http://10.0.2.2:3001/health' // Android emulator
    ];
    
    for (const url of alternatives) {
      try {
        console.log(`Trying ${url}...`);
        const response = await fetch(url);
        const data = await response.json();
        console.log(`✅ Success with ${url}!`);
        console.log('Response:', data);
        return true;
      } catch (err) {
        console.log(`❌ Failed with ${url}:`, err.message);
      }
    }
    
    return false;
  }
};

export default testConnection;
