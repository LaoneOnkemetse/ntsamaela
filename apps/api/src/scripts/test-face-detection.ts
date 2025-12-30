/**
 * Test Face Detection and Comparison with Google Cloud Vision API
 * Run with: npx ts-node -r tsconfig-paths/register src/scripts/test-face-detection.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import GoogleVisionService from '../services/googleVisionService';

// Load environment variables BEFORE importing the service
const scriptDir = __dirname;
const rootEnvPath = path.resolve(scriptDir, '../../../.env');
const apiEnvPath = path.resolve(scriptDir, '../../.env');
const workspaceRoot = path.resolve(scriptDir, '../../../../.env');

console.log(`🔍 Looking for .env files:`);
console.log(`   Root: ${rootEnvPath} (${fs.existsSync(rootEnvPath) ? '✅' : '❌'})`);
console.log(`   API: ${apiEnvPath} (${fs.existsSync(apiEnvPath) ? '✅' : '❌'})`);
console.log(`   Workspace: ${workspaceRoot} (${fs.existsSync(workspaceRoot) ? '✅' : '❌'})`);

// Try workspace root first (most likely location)
if (fs.existsSync(workspaceRoot)) {
  dotenv.config({ path: workspaceRoot, override: true });
  console.log(`✅ Loaded .env from workspace root\n`);
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath, override: true });
  console.log(`✅ Loaded .env from root\n`);
} else if (fs.existsSync(apiEnvPath)) {
  dotenv.config({ path: apiEnvPath, override: true });
  console.log(`✅ Loaded .env from API directory\n`);
} else {
  dotenv.config({ override: true });
  console.log(`⚠️  Using default dotenv behavior\n`);
}

// Create a simple test image (1x1 pixel PNG) - This won't have a face, but will test the API connection
function createTestImage(): string {
  const imageBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE,
    0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
    0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND
  ]);
  return imageBuffer.toString('base64');
}

// Test service initialization
async function testServiceInitialization() {
  console.log('1️⃣ Testing Face Detection Service Initialization...');
  
  try {
    const service = new GoogleVisionService();
    console.log('✅ Face Detection Service initialized successfully\n');
    return { success: true, service };
  } catch (error: any) {
    console.log(`❌ Service initialization failed: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

// Test face detection
async function testFaceDetection(service: GoogleVisionService, imageBase64: string) {
  console.log('2️⃣ Testing Face Detection...');
  
  try {
    // Test face liveness (which internally uses face detection)
    const result = await service.analyzeFaceLiveness(imageBase64);
    
    console.log(`✅ Face detection completed!`);
    console.log(`   Face Detected: ${result.spoofingIndicators.length === 0 || result.spoofingIndicators[0] !== 'No face detected' ? 'Yes' : 'No'}`);
    console.log(`   Liveness: ${result.isLive ? 'Live' : 'Not Live'}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(2)}%`);
    console.log(`   Spoofing Indicators: ${result.spoofingIndicators.length > 0 ? result.spoofingIndicators.join(', ') : 'None'}\n`);
    
    return { success: true, result };
  } catch (error: any) {
    console.log(`❌ Face detection failed: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

// Test face comparison
async function testFaceComparison(service: GoogleVisionService, image1Base64: string, image2Base64: string) {
  console.log('3️⃣ Testing Face Comparison...');
  
  try {
    const result = await service.performFacialRecognition(
      image1Base64,
      image2Base64,
      'test-user-id'
    );
    
    console.log(`✅ Face comparison completed!`);
    console.log(`   Match: ${result.match ? 'Yes' : 'No'}`);
    console.log(`   Confidence: ${(result.confidence).toFixed(2)}%`);
    console.log(`   Face Detected: ${result.faceDetected ? 'Yes' : 'No'}`);
    console.log(`   Face Quality: ${(result.faceQuality * 100).toFixed(2)}%`);
    console.log(`   Landmarks Detected: ${result.landmarks.length}`);
    console.log(`   Processing Time: ${result.processingTime}ms\n`);
    
    return { success: true, result };
  } catch (error: any) {
    console.log(`❌ Face comparison failed: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

// Test document authenticity analysis
async function testDocumentAuthenticity(service: GoogleVisionService, imageBase64: string, documentType: 'DRIVERS_LICENSE' | 'PASSPORT' | 'NATIONAL_ID') {
  console.log(`4️⃣ Testing Document Authenticity Analysis (${documentType})...`);
  
  try {
    const result = await service.analyzeDocumentAuthenticity(imageBase64, documentType);
    
    console.log(`✅ Document authenticity analysis completed!`);
    console.log(`   Is Authentic: ${result.isAuthentic ? 'Yes' : 'No'}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(2)}%`);
    console.log(`   Security Features: ${result.securityFeatures.length}`);
    console.log(`   Anomalies: ${result.anomalies.length}`);
    if (result.anomalies.length > 0) {
      result.anomalies.forEach(anomaly => {
        console.log(`     - ${anomaly.type}: ${anomaly.description} (${anomaly.severity})`);
      });
    }
    if (result.issuer) {
      console.log(`   Issuer: ${result.issuer}`);
    }
    console.log('');
    
    return { success: true, result };
  } catch (error: any) {
    console.log(`❌ Document authenticity analysis failed: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

// Test configuration check
function testConfiguration() {
  console.log('📋 Configuration Check:');
  
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY;
  const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL;

  console.log(`   GOOGLE_CLOUD_PROJECT_ID: ${projectId ? '✅ Set' : '❌ Missing'}`);
  console.log(`   GOOGLE_CLOUD_PRIVATE_KEY: ${privateKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   GOOGLE_CLOUD_CLIENT_EMAIL: ${clientEmail ? '✅ Set' : '❌ Missing'}\n`);

  if (!projectId || !privateKey || !clientEmail) {
    console.log('❌ Google Cloud Vision is not fully configured.\n');
    return false;
  }

  return true;
}

// Main test function
async function runTests() {
  console.log('🧪 Testing Face Detection and Comparison with Google Cloud Vision API\n');

  // Check configuration
  const configOk = testConfiguration();
  if (!configOk) {
    console.log('❌ Configuration check failed. Please set up Google Cloud credentials.\n');
    process.exit(1);
  }

  // Test initialization
  const initResult = await testServiceInitialization();
  if (!initResult.success) {
    console.log('❌ Service initialization failed. Check your credentials.\n');
    process.exit(1);
  }

  const service = initResult.service!;

  // Test with a simple image (won't have a face, but will test API connection)
  const testImage = createTestImage();
  
  // Test face detection
  const faceDetectionResult = await testFaceDetection(service, testImage);
  
  // Test face comparison (comparing same image with itself)
  const faceComparisonResult = await testFaceComparison(service, testImage, testImage);
  
  // Test document authenticity analysis
  const results = {
    driverLicense: await testDocumentAuthenticity(service, testImage, 'DRIVERS_LICENSE'),
    passport: await testDocumentAuthenticity(service, testImage, 'PASSPORT'),
    nationalId: await testDocumentAuthenticity(service, testImage, 'NATIONAL_ID'),
  };

  // Summary
  console.log('📊 Test Summary:');
  console.log(`   Service Initialization: ${initResult.success ? '✅' : '❌'}`);
  console.log(`   Face Detection: ${faceDetectionResult.success ? '✅' : '❌'}`);
  console.log(`   Face Comparison: ${faceComparisonResult.success ? '✅' : '❌'}`);
  console.log(`   Driver License Analysis: ${results.driverLicense.success ? '✅' : '❌'}`);
  console.log(`   Passport Analysis: ${results.passport.success ? '✅' : '❌'}`);
  console.log(`   National ID Analysis: ${results.nationalId.success ? '✅' : '❌'}\n`);

  const allPassed = initResult.success && 
                    faceDetectionResult.success && 
                    faceComparisonResult.success &&
                    results.driverLicense.success && 
                    results.passport.success && 
                    results.nationalId.success;

  if (allPassed) {
    console.log('🎉 All face detection tests passed!');
    console.log('✅ Google Cloud Vision API is working correctly for face detection.');
    console.log('\n💡 Note: The test image has no face, so face detection will return "No face detected".');
    console.log('   To test with real face images, provide base64-encoded images of faces.\n');
  } else {
    console.log('⚠️  Some tests failed.');
    console.log('   Check the errors above for details.\n');
  }

  process.exit(allPassed ? 0 : 1);
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

