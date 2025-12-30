/**
 * Direct test of Cloudinary upload service (bypasses API and database)
 * Run with: npx ts-node -r tsconfig-paths/register src/scripts/test-upload-service-direct.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables BEFORE importing the service
// Load environment variables from multiple locations
// Resolve paths relative to the script location
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
  // Fallback to default dotenv behavior
  dotenv.config({ override: true });
  console.log(`⚠️  Using default dotenv behavior\n`);
}

// Now import the service after env vars are loaded
import cloudinaryUploadService from '../services/cloudinaryUploadService';

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

// Test package image upload
async function testPackageImageUpload() {
  console.log('1️⃣ Testing Package Image Upload...');
  
  try {
    const testImage = createTestImage();
    const testFile = {
      fieldname: 'image',
      originalname: 'test-package.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: testImage.length,
      buffer: testImage,
    };

    const result = await cloudinaryUploadService.uploadPackageImage(
      testFile,
      'test-user-id',
      'test-package-id'
    );

    console.log('✅ Package image uploaded successfully!');
    console.log(`   URL: ${result.url}`);
    console.log(`   Key: ${result.key}`);
    console.log(`   Bucket: ${result.bucket}`);
    console.log(`   ✅ URL is Cloudinary: ${result.url.includes('cloudinary.com') ? 'Yes' : 'No'}\n`);
    return { success: true, result };
  } catch (error: any) {
    console.log(`❌ Package image upload failed: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

// Test profile picture upload
async function testProfilePictureUpload() {
  console.log('2️⃣ Testing Profile Picture Upload...');
  
  try {
    const testImage = createTestImage();
    const testFile = {
      fieldname: 'profilePicture',
      originalname: 'test-profile.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: testImage.length,
      buffer: testImage,
    };

    const result = await cloudinaryUploadService.uploadProfilePicture(
      testFile,
      'test-user-id'
    );

    console.log('✅ Profile picture uploaded successfully!');
    console.log(`   URL: ${result.url}`);
    console.log(`   Key: ${result.key}`);
    console.log(`   Bucket: ${result.bucket}`);
    console.log(`   ✅ URL is Cloudinary: ${result.url.includes('cloudinary.com') ? 'Yes' : 'No'}\n`);
    return { success: true, result };
  } catch (error: any) {
    console.log(`❌ Profile picture upload failed: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

// Test generic file upload
async function testGenericFileUpload() {
  console.log('3️⃣ Testing Generic File Upload...');
  
  try {
    const testImage = createTestImage();
    const testFile = {
      fieldname: 'file',
      originalname: 'test-file.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: testImage.length,
      buffer: testImage,
    };

    const result = await cloudinaryUploadService.uploadFile(
      testFile,
      'test-user-id'
    );

    console.log('✅ Generic file uploaded successfully!');
    console.log(`   URL: ${result.url}`);
    console.log(`   Key: ${result.key}`);
    console.log(`   Bucket: ${result.bucket}`);
    console.log(`   ✅ URL is Cloudinary: ${result.url.includes('cloudinary.com') ? 'Yes' : 'No'}\n`);
    return { success: true, result };
  } catch (error: any) {
    console.log(`❌ Generic file upload failed: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

// Test image deletion
async function testImageDeletion(publicId: string) {
  console.log('4️⃣ Testing Image Deletion...');
  
  try {
    await cloudinaryUploadService.deleteImage(publicId);
    console.log('✅ Image deleted successfully!\n');
    return { success: true };
  } catch (error: any) {
    console.log(`❌ Image deletion failed: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

// Test signed URL generation
async function testSignedUrl(publicId: string) {
  console.log('5️⃣ Testing Signed URL Generation...');
  
  try {
    const signedUrl = await cloudinaryUploadService.getSignedUrl(publicId, 3600);
    console.log('✅ Signed URL generated successfully!');
    console.log(`   URL: ${signedUrl}`);
    console.log(`   ✅ URL is Cloudinary: ${signedUrl.includes('cloudinary.com') ? 'Yes' : 'No'}\n`);
    return { success: true, url: signedUrl };
  } catch (error: any) {
    console.log(`❌ Signed URL generation failed: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Testing Cloudinary Upload Service Directly\n');
  
  // Check Cloudinary configuration
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  console.log('📋 Configuration Check:');
  console.log(`   CLOUDINARY_CLOUD_NAME: ${cloudName ? '✅ Set' : '❌ Missing'}`);
  console.log(`   CLOUDINARY_API_KEY: ${apiKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   CLOUDINARY_API_SECRET: ${apiSecret ? '✅ Set' : '❌ Missing'}\n`);

  if (!cloudName || !apiKey || !apiSecret) {
    console.log('❌ Cloudinary is not configured. Please set the required environment variables.\n');
    process.exit(1);
  }

  const results = {
    packageUpload: await testPackageImageUpload(),
    profileUpload: await testProfilePictureUpload(),
    genericUpload: await testGenericFileUpload(),
  };

  // Test deletion and signed URL with one of the uploaded images
  let testPublicId: string | null = null;
  if (results.packageUpload.success && results.packageUpload.result) {
    testPublicId = results.packageUpload.result.key;
  } else if (results.profileUpload.success && results.profileUpload.result) {
    testPublicId = results.profileUpload.result.key;
  } else if (results.genericUpload.success && results.genericUpload.result) {
    testPublicId = results.genericUpload.result.key;
  }

  let deletionResult = { success: false };
  let signedUrlResult = { success: false };

  if (testPublicId) {
    signedUrlResult = await testSignedUrl(testPublicId);
    // Note: We'll skip deletion in test to keep the image for verification
    // deletionResult = await testImageDeletion(testPublicId);
  }

  // Summary
  console.log('📊 Test Summary:');
  console.log(`   Package Image Upload: ${results.packageUpload.success ? '✅' : '❌'}`);
  console.log(`   Profile Picture Upload: ${results.profileUpload.success ? '✅' : '❌'}`);
  console.log(`   Generic File Upload: ${results.genericUpload.success ? '✅' : '❌'}`);
  console.log(`   Signed URL Generation: ${signedUrlResult.success ? '✅' : '❌'}`);
  console.log(`   Image Deletion: ⚠️  Skipped (to keep test images)\n`);

  const allPassed = results.packageUpload.success && 
                    results.profileUpload.success && 
                    results.genericUpload.success &&
                    signedUrlResult.success;

  if (allPassed) {
    console.log('🎉 All Cloudinary upload service tests passed!');
    console.log('✅ Cloudinary integration is working correctly.');
  } else {
    console.log('⚠️  Some tests failed.');
    console.log('   Check the errors above for details.');
  }

  process.exit(allPassed ? 0 : 1);
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

