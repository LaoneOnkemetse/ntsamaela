const fetch = require('node-fetch');

const API_BASE = 'http://192.168.1.116:3001/api';

async function testRealBackend() {
  console.log('🧪 Testing Real Backend API...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health check...');
    const healthResponse = await fetch(`${API_BASE.replace('/api', '')}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.status);

    // Test 2: Register a test customer
    console.log('\n2️⃣ Testing customer registration...');
    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'Customer',
        phone: '71234567',
        password: 'password123',
        userType: 'CUSTOMER'
      })
    });
    const registerData = await registerResponse.json();
    console.log('✅ Customer registration:', registerData.success ? 'Success' : 'Failed');
    if (!registerData.success) {
      console.log('   Error:', registerData.error.message);
    }

    // Test 3: Register a test driver
    console.log('\n3️⃣ Testing driver registration...');
    const driverRegisterResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'Driver',
        phone: '72345678',
        password: 'password123',
        userType: 'DRIVER'
      })
    });
    const driverRegisterData = await driverRegisterResponse.json();
    console.log('✅ Driver registration:', driverRegisterData.success ? 'Success' : 'Failed');
    if (!driverRegisterData.success) {
      console.log('   Error:', driverRegisterData.error.message);
    }

    // Test 4: Login as customer
    console.log('\n4️⃣ Testing customer login...');
    const loginResponse = await fetch(`${API_BASE}/auth/login-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '71234567',
        password: 'password123'
      })
    });
    const loginData = await loginResponse.json();
    console.log('✅ Customer login:', loginData.success ? 'Success' : 'Failed');
    
    if (loginData.success) {
      const customerToken = loginData.data.token;
      console.log('   Token received:', customerToken.substring(0, 20) + '...');

      // Test 5: Create a package
      console.log('\n5️⃣ Testing package creation...');
      const packageResponse = await fetch(`${API_BASE}/packages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({
          description: 'Test package from real backend',
          pickupAddress: '123 Main St, Gaborone',
          pickupLat: -24.6581,
          pickupLng: 25.9088,
          deliveryAddress: '456 Side Rd, Gaborone',
          deliveryLat: -24.6681,
          deliveryLng: 25.9188,
          priceOffered: 150,
          weight: 1.5,
          deliveryDate: new Date(Date.now() + 86400000).toISOString(),
          urgency: 'NORMAL',
          recipientPhone: '71234567'
        })
      });
      const packageData = await packageResponse.json();
      console.log('✅ Package creation:', packageData.success ? 'Success' : 'Failed');
      if (!packageData.success) {
        console.log('   Error:', packageData.error.message);
      }

      // Test 6: Get packages
      console.log('\n6️⃣ Testing get packages...');
      const getPackagesResponse = await fetch(`${API_BASE}/packages`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
      });
      const getPackagesData = await getPackagesResponse.json();
      console.log('✅ Get packages:', getPackagesData.success ? 'Success' : 'Failed');
      if (getPackagesData.success) {
        console.log('   Packages found:', getPackagesData.data.length);
      }
    }

    // Test 7: Login as driver
    console.log('\n7️⃣ Testing driver login...');
    const driverLoginResponse = await fetch(`${API_BASE}/auth/login-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '72345678',
        password: 'password123'
      })
    });
    const driverLoginData = await driverLoginResponse.json();
    console.log('✅ Driver login:', driverLoginData.success ? 'Success' : 'Failed');
    
    if (driverLoginData.success) {
      const driverToken = driverLoginData.data.token;
      console.log('   Token received:', driverToken.substring(0, 20) + '...');

      // Test 8: Get available packages for driver
      console.log('\n8️⃣ Testing get available packages for driver...');
      const driverPackagesResponse = await fetch(`${API_BASE}/packages`, {
        headers: { 'Authorization': `Bearer ${driverToken}` }
      });
      const driverPackagesData = await driverPackagesResponse.json();
      console.log('✅ Get driver packages:', driverPackagesData.success ? 'Success' : 'Failed');
      if (driverPackagesData.success) {
        console.log('   Available packages:', driverPackagesData.data.length);
      }
    }

    console.log('\n🎉 Real Backend API testing completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRealBackend();
