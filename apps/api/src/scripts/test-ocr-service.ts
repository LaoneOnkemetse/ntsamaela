/**
 * Test OCR Service with Google Cloud Vision API
 * Run with: npx ts-node -r tsconfig-paths/register src/scripts/test-ocr-service.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import OCRService from '../services/ocrService';

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

// Create a simple test image (1x1 pixel PNG) - This won't have text, but will test the API connection
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

// Test OCR service initialization
async function testOCRServiceInitialization() {
  console.log('1️⃣ Testing OCR Service Initialization...');
  
  try {
    const ocrService = new OCRService();
    console.log('✅ OCR Service initialized successfully\n');
    return { success: true, service: ocrService };
  } catch (error: any) {
    console.log(`❌ OCR Service initialization failed: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

// Test OCR with a simple image (will test API connection even if no text found)
async function testOCRWithImage(ocrService: OCRService, imageBase64: string, documentType: 'DRIVERS_LICENSE' | 'PASSPORT' | 'NATIONAL_ID') {
  console.log(`2️⃣ Testing OCR Extraction (${documentType})...`);
  
  try {
    const result = await ocrService.extractDocumentData(imageBase64, documentType);
    
    console.log(`✅ OCR extraction completed!`);
    console.log(`   Processing Time: ${result.processingTime}ms`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(2)}%`);
    console.log(`   Errors: ${result.errors.length > 0 ? result.errors.join(', ') : 'None'}`);
    
    if (result.extractedData) {
      console.log(`   Extracted Data:`);
      if (result.extractedData.documentNumber) {
        console.log(`     - Document Number: ${result.extractedData.documentNumber}`);
      }
      if (result.extractedData.firstName) {
        console.log(`     - First Name: ${result.extractedData.firstName}`);
      }
      if (result.extractedData.lastName) {
        console.log(`     - Last Name: ${result.extractedData.lastName}`);
      }
      if (result.extractedData.dateOfBirth) {
        console.log(`     - Date of Birth: ${result.extractedData.dateOfBirth}`);
      }
      if (result.extractedData.expiryDate) {
        console.log(`     - Expiry Date: ${result.extractedData.expiryDate}`);
      }
    }
    console.log('');
    
    return { success: true, result };
  } catch (error: any) {
    console.log(`❌ OCR extraction failed: ${error.message}\n`);
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

  // Check if private key looks valid
  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    console.log('⚠️  Private key format may be incorrect (should start with "BEGIN PRIVATE KEY")\n');
  }

  return true;
}

// Main test function
async function runTests() {
  console.log('🧪 Testing OCR Service with Google Cloud Vision API\n');

  // Check configuration
  const configOk = testConfiguration();
  if (!configOk) {
    console.log('❌ Configuration check failed. Please set up Google Cloud credentials.\n');
    process.exit(1);
  }

  // Test initialization
  const initResult = await testOCRServiceInitialization();
  if (!initResult.success) {
    console.log('❌ Service initialization failed. Check your credentials.\n');
    process.exit(1);
  }

  const ocrService = initResult.service!;

  // Test with a simple image (won't have text, but will test API connection)
  const testImage = createTestImage();
  
  const results = {
    driverLicense: await testOCRWithImage(ocrService, testImage, 'DRIVERS_LICENSE'),
    passport: await testOCRWithImage(ocrService, testImage, 'PASSPORT'),
    nationalId: await testOCRWithImage(ocrService, testImage, 'NATIONAL_ID'),
  };

  // Summary
  console.log('📊 Test Summary:');
  console.log(`   Service Initialization: ${initResult.success ? '✅' : '❌'}`);
  console.log(`   Driver License OCR: ${results.driverLicense.success ? '✅' : '❌'}`);
  console.log(`   Passport OCR: ${results.passport.success ? '✅' : '❌'}`);
  console.log(`   National ID OCR: ${results.nationalId.success ? '✅' : '❌'}\n`);

  const allPassed = initResult.success && 
                    results.driverLicense.success && 
                    results.passport.success && 
                    results.nationalId.success;

  if (allPassed) {
    console.log('🎉 All OCR service tests passed!');
    console.log('✅ Google Cloud Vision API is working correctly.');
    console.log('\n💡 Note: The test image has no text, so extracted data will be empty.');
    console.log('   To test with real documents, provide a base64-encoded image of a document.\n');
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

