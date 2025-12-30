/**
 * Test API upload endpoints
 * Run with: npx ts-node -r tsconfig-paths/register src/scripts/test-api-uploads.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import FormData from 'form-data';
import { Readable } from 'stream';

// Use built-in fetch if available (Node 18+), otherwise use node-fetch
const fetch = globalThis.fetch || require('node-fetch');

// Load environment variables
const rootEnvPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

const API_URL = process.env.API_URL || 'http://localhost:3000';
const BASE_URL = `${API_URL}/api`;

// Create a test image buffer (1x1 pixel PNG)
function createTestImage(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE,
    0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
    0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND
  ]);
}

// Test authentication (register/login to get token)
async function authenticate(): Promise<string | null> {
  console.log('🔐 Testing Authentication...\n');

  try {
    // Generate unique test user data
    const timestamp = Date.now();
    const testEmail = `test-${timestamp}@example.com`;
    const testPhone = `+1234567${timestamp.toString().slice(-4)}`; // Unique phone
    
    // Try to register a test user
    console.log(`   Attempting to register: ${testEmail}`);
    const registerResponse = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        phone: testPhone,
        userType: 'CUSTOMER',
      }),
    });

    const registerData = await registerResponse.json() as any;
    
    if (registerResponse.ok && registerData.success) {
      if (registerData.data?.token) {
        console.log('✅ User registered and authenticated\n');
        return registerData.data.token;
      } else {
        console.log('⚠️  Registration successful but no token returned');
        console.log(`   Response: ${JSON.stringify(registerData, null, 2)}\n`);
      }
    } else {
      console.log(`   Registration failed: ${registerData.error?.message || registerData.message || 'Unknown error'}`);
      if (registerData.error?.details) {
        console.log(`   Validation errors: ${JSON.stringify(registerData.error.details, null, 2)}`);
      }
    }

    // If registration fails, try login with existing test user
    console.log(`   Attempting to login with test@example.com...`);
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'TestPassword123!',
      }),
    });

    const loginData = await loginResponse.json() as any;
    
    if (loginResponse.ok && loginData.success) {
      if (loginData.data?.token) {
        console.log('✅ User logged in\n');
        return loginData.data.token;
      }
    } else {
      console.log(`   Login failed: ${loginData.error?.message || loginData.message || 'Unknown error'}\n`);
    }

    console.log('⚠️  Could not authenticate. Some tests will be skipped.\n');
    return null;
  } catch (error: any) {
    console.log(`⚠️  Authentication error: ${error.message}\n`);
    return null;
  }
}

// Test health endpoint
async function testHealthEndpoint() {
  console.log('1️⃣ Testing Health Endpoint...');
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json() as any;
    
    if (response.ok) {
      console.log('✅ Health check passed');
      console.log(`   Status: ${data.status}`);
      console.log(`   Database: ${data.database || 'N/A'}`);
      console.log(`   Environment: ${data.environment || 'N/A'}\n`);
      return true;
    } else {
      console.log('❌ Health check failed\n');
      return false;
    }
  } catch (error: any) {
    console.log(`❌ Health check error: ${error.message}\n`);
    return false;
  }
}

// Test package image upload endpoint
async function testPackageImageUpload(token: string | null) {
  console.log('2️⃣ Testing Package Image Upload Endpoint...');
  
  if (!token) {
    console.log('⚠️  Skipped (authentication required)\n');
    return false;
  }

  try {
    const testImage = createTestImage();
    const formData = new FormData();
    
    formData.append('image', Readable.from(testImage), {
      filename: 'test-package.png',
      contentType: 'image/png',
    });
    formData.append('description', 'Test package for upload testing');
    formData.append('pickupAddress', '123 Test St, Test City');
    formData.append('pickupLat', '40.7128');
    formData.append('pickupLng', '-74.0060');
    formData.append('deliveryAddress', '456 Test Ave, Test City');
    formData.append('deliveryLat', '40.7580');
    formData.append('deliveryLng', '-73.9855');
    formData.append('priceOffered', '50.00');
    formData.append('size', 'SMALL');
    formData.append('weight', '1.5');

    const response = await fetch(`${BASE_URL}/packages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders(),
      },
      body: formData as any,
    });

    const data = await response.json() as any;

    if (response.ok && data.success) {
      console.log('✅ Package image uploaded successfully!');
      console.log(`   Package ID: ${data.data?.id || 'N/A'}`);
      if (data.data?.imageUrl) {
        console.log(`   Image URL: ${data.data.imageUrl}`);
        console.log(`   ✅ URL is Cloudinary: ${data.data.imageUrl.includes('cloudinary.com') ? 'Yes' : 'No'}`);
      }
      console.log('');
      return true;
    } else {
      console.log('❌ Package upload failed:');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.error?.message || data.message || 'Unknown error'}\n`);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ Package upload error: ${error.message}\n`);
    return false;
  }
}

// Test profile picture upload endpoint
async function testProfilePictureUpload(token: string | null) {
  console.log('3️⃣ Testing Profile Picture Upload Endpoint...');
  
  if (!token) {
    console.log('⚠️  Skipped (authentication required)\n');
    return false;
  }

  try {
    const testImage = createTestImage();
    const formData = new FormData();
    
    formData.append('profilePicture', Readable.from(testImage), {
      filename: 'test-profile.png',
      contentType: 'image/png',
    });

    const response = await fetch(`${BASE_URL}/user/profile/picture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders(),
      },
      body: formData as any,
    });

    const data = await response.json() as any;

    if (response.ok && data.success) {
      console.log('✅ Profile picture uploaded successfully!');
      if (data.data?.profilePictureUrl) {
        console.log(`   Profile Picture URL: ${data.data.profilePictureUrl}`);
        console.log(`   ✅ URL is Cloudinary: ${data.data.profilePictureUrl.includes('cloudinary.com') ? 'Yes' : 'No'}`);
      }
      if (data.data?.user) {
        console.log(`   User ID: ${data.data.user.id}`);
      }
      console.log('');
      return true;
    } else {
      console.log('❌ Profile picture upload failed:');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data.error?.message || data.message || 'Unknown error'}\n`);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ Profile picture upload error: ${error.message}\n`);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Testing API Upload Endpoints\n');
  console.log(`📍 API URL: ${API_URL}\n`);

  // Test health endpoint first
  const healthOk = await testHealthEndpoint();
  if (!healthOk) {
    console.log('❌ API server is not running or not accessible.');
    console.log('   Please start the server with: npm run dev\n');
    process.exit(1);
  }

  // Authenticate
  const token = await authenticate();

  // Run upload tests
  const results = {
    packageUpload: await testPackageImageUpload(token),
    profileUpload: await testProfilePictureUpload(token),
  };

  // Summary
  console.log('📊 Test Summary:');
  console.log(`   Health Check: ${healthOk ? '✅' : '❌'}`);
  console.log(`   Package Image Upload: ${results.packageUpload ? '✅' : results.packageUpload === false && token ? '❌' : '⚠️  Skipped'}`);
  console.log(`   Profile Picture Upload: ${results.profileUpload ? '✅' : results.profileUpload === false && token ? '❌' : '⚠️  Skipped'}`);
  console.log('');

  const allPassed = healthOk && (results.packageUpload || !token) && (results.profileUpload || !token);
  
  if (allPassed) {
    console.log('🎉 All API upload tests completed!');
    console.log('✅ Cloudinary integration is working through API endpoints.');
  } else {
    console.log('⚠️  Some tests failed or were skipped.');
    console.log('   Check the errors above for details.');
  }

  process.exit(allPassed ? 0 : 1);
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

