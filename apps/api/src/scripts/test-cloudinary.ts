/**
 * Test script for Cloudinary upload functionality
 * Run with: npx ts-node -r tsconfig-paths/register src/scripts/test-cloudinary.ts
 */

// Load environment variables from root .env file
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try to load .env from root directory (3 levels up from dist/scripts or src/scripts)
const rootEnvPath = path.resolve(__dirname, '../../../.env');
const altRootEnvPath = path.resolve(process.cwd(), '../../.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
  console.log(`📁 Loaded .env from: ${rootEnvPath}\n`);
} else if (fs.existsSync(altRootEnvPath)) {
  dotenv.config({ path: altRootEnvPath });
  console.log(`📁 Loaded .env from: ${altRootEnvPath}\n`);
} else {
  // Try from current working directory
  dotenv.config();
  console.log('📁 Loaded .env from current directory\n');
}

import cloudinaryUploadService from '../services/cloudinaryUploadService';

// Create a simple test image (1x1 pixel PNG)
const createTestImage = (): Buffer => {
  // Minimal valid PNG file (1x1 pixel, red)
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // Bit depth, color type, etc.
    0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
    0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // Image data
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND
  ]);
  return pngData;
};

async function testCloudinaryUpload() {
  console.log('🧪 Testing Cloudinary Upload Service...\n');

  // Check configuration
  console.log('1️⃣ Checking Cloudinary Configuration...');
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error('❌ Cloudinary not configured!');
    console.error('Missing environment variables:');
    if (!cloudName) console.error('  - CLOUDINARY_CLOUD_NAME');
    if (!apiKey) console.error('  - CLOUDINARY_API_KEY');
    if (!apiSecret) console.error('  - CLOUDINARY_API_SECRET');
    console.error('\nPlease check your .env file.');
    process.exit(1);
  }

  console.log('✅ Configuration found:');
  console.log(`   Cloud Name: ${cloudName}`);
  console.log(`   API Key: ${apiKey.substring(0, 8)}...`);
  console.log(`   API Secret: ${apiSecret.substring(0, 8)}...\n`);

  // Create test image
  console.log('2️⃣ Creating test image...');
  const testImageBuffer = createTestImage();
  console.log(`✅ Test image created (${testImageBuffer.length} bytes)\n`);

  // Test package image upload
  console.log('3️⃣ Testing Package Image Upload...');
  try {
    const testFile = {
      fieldname: 'image',
      originalname: 'test-package.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: testImageBuffer.length,
      buffer: testImageBuffer,
    };

    const result = await cloudinaryUploadService.uploadPackageImage(
      testFile,
      'test-user-123',
      'test-package-456'
    );

    console.log('✅ Package image uploaded successfully!');
    console.log(`   URL: ${result.url}`);
    console.log(`   Public ID: ${result.key}`);
    console.log(`   Folder: ${result.bucket}\n`);

    // Test deletion
    console.log('4️⃣ Testing Image Deletion...');
    await cloudinaryUploadService.deleteImage(result.key);
    console.log('✅ Image deleted successfully!\n');

  } catch (error: any) {
    console.error('❌ Package image upload failed:');
    console.error(`   Error: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    process.exit(1);
  }

  // Test profile picture upload
  console.log('5️⃣ Testing Profile Picture Upload...');
  try {
    const testFile = {
      fieldname: 'image',
      originalname: 'test-profile.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: testImageBuffer.length,
      buffer: testImageBuffer,
    };

    const result = await cloudinaryUploadService.uploadProfilePicture(
      testFile,
      'test-user-123'
    );

    console.log('✅ Profile picture uploaded successfully!');
    console.log(`   URL: ${result.url}`);
    console.log(`   Public ID: ${result.key}`);
    console.log(`   Folder: ${result.bucket}\n`);

    // Test signed URL
    console.log('6️⃣ Testing Signed URL Generation...');
    const signedUrl = await cloudinaryUploadService.getSignedUrl(result.key, 3600);
    console.log('✅ Signed URL generated successfully!');
    console.log(`   URL: ${signedUrl.substring(0, 80)}...\n`);

    // Clean up
    console.log('7️⃣ Cleaning up test image...');
    await cloudinaryUploadService.deleteImage(result.key);
    console.log('✅ Test image deleted!\n');

  } catch (error: any) {
    console.error('❌ Profile picture upload failed:');
    console.error(`   Error: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    process.exit(1);
  }

  // Test generic file upload
  console.log('8️⃣ Testing Generic File Upload...');
  try {
    const testFile = {
      fieldname: 'file',
      originalname: 'test-document.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: testImageBuffer.length,
      buffer: testImageBuffer,
    };

    const result = await cloudinaryUploadService.uploadFile(
      testFile,
      'test-uploads',
      {
        metadata: {
          test: 'true',
          uploadedAt: new Date().toISOString(),
        },
      }
    );

    console.log('✅ Generic file uploaded successfully!');
    console.log(`   URL: ${result.url}`);
    console.log(`   Public ID: ${result.key}\n`);

    // Clean up
    await cloudinaryUploadService.deleteImage(result.key);
    console.log('✅ Test file deleted!\n');

  } catch (error: any) {
    console.error('❌ Generic file upload failed:');
    console.error(`   Error: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    process.exit(1);
  }

  console.log('🎉 All Cloudinary tests passed successfully!');
  console.log('\n✅ Your file upload system is working correctly with Cloudinary.');
  console.log('✅ No AWS S3 dependencies required.');
}

// Run tests
testCloudinaryUpload().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

