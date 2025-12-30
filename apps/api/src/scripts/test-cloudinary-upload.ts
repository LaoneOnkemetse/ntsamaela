/**
 * Test script for Cloudinary upload functionality
 * Run with: npx ts-node -r tsconfig-paths/register src/scripts/test-cloudinary-upload.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root directory
// Script is in apps/api/src/scripts/, .env is in root
const scriptDir = __dirname || path.dirname(require.main?.filename || '');
const envPath = path.resolve(scriptDir, '../../../../.env');
dotenv.config({ path: envPath });

// Alternative: try loading from multiple possible locations
if (!process.env.CLOUDINARY_CLOUD_NAME) {
  // Try root directory
  dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
  // Try current directory
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

import cloudinaryUploadService from '../services/cloudinaryUploadService';

// Create a simple test image (1x1 pixel PNG)
const createTestImage = (): Buffer => {
  // Minimal valid PNG (1x1 pixel, transparent)
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // Width: 1
    0x00, 0x00, 0x00, 0x01, // Height: 1
    0x08, 0x06, 0x00, 0x00, 0x00, // Bit depth, color type, compression, filter, interlace
    0x1F, 0x15, 0xC4, 0x89, // CRC
    0x00, 0x00, 0x00, 0x0A, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // Compressed data
    0x0D, 0x0A, 0x2D, 0xB4, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82, // CRC
  ]);
  return pngData;
};

async function testCloudinaryUpload() {
  console.log('🧪 Testing Cloudinary Upload Service...\n');

  try {
    // Test 1: Check configuration
    console.log('1️⃣ Checking Cloudinary configuration...');
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('❌ Cloudinary not configured!');
      console.error('Missing environment variables:');
      if (!cloudName) console.error('  - CLOUDINARY_CLOUD_NAME');
      if (!apiKey) console.error('  - CLOUDINARY_API_KEY');
      if (!apiSecret) console.error('  - CLOUDINARY_API_SECRET');
      process.exit(1);
    }

    console.log('✅ Configuration found:');
    console.log(`   Cloud Name: ${cloudName}`);
    console.log(`   API Key: ${apiKey.substring(0, 8)}...`);
    console.log(`   API Secret: ${apiSecret.substring(0, 8)}...\n`);

    // Test 2: Create test image
    console.log('2️⃣ Creating test image...');
    const testImageBuffer = createTestImage();
    console.log(`✅ Test image created (${testImageBuffer.length} bytes)\n`);

    // Test 3: Upload package image
    console.log('3️⃣ Testing package image upload...');
    const testMulterFile = {
      fieldname: 'image',
      originalname: 'test-package.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: testImageBuffer.length,
      buffer: testImageBuffer,
    };

    const packageResult = await cloudinaryUploadService.uploadPackageImage(
      testMulterFile,
      'test-user-123',
      'test-package-456'
    );

    console.log('✅ Package image uploaded successfully!');
    console.log(`   URL: ${packageResult.url}`);
    console.log(`   Public ID: ${packageResult.key}`);
    console.log(`   Folder: ${packageResult.bucket}\n`);

    // Test 4: Upload profile picture
    console.log('4️⃣ Testing profile picture upload...');
    const profileResult = await cloudinaryUploadService.uploadProfilePicture(
      testMulterFile,
      'test-user-123'
    );

    console.log('✅ Profile picture uploaded successfully!');
    console.log(`   URL: ${profileResult.url}`);
    console.log(`   Public ID: ${profileResult.key}`);
    console.log(`   Folder: ${profileResult.bucket}\n`);

    // Test 5: Generate signed URL
    console.log('5️⃣ Testing signed URL generation...');
    const signedUrl = await cloudinaryUploadService.getSignedUrl(
      packageResult.key,
      3600
    );
    console.log('✅ Signed URL generated!');
    console.log(`   URL: ${signedUrl}\n`);

    // Test 6: Delete test images
    console.log('6️⃣ Cleaning up test images...');
    await cloudinaryUploadService.deleteImage(packageResult.key);
    await cloudinaryUploadService.deleteImage(profileResult.key);
    console.log('✅ Test images deleted\n');

    // Summary
    console.log('🎉 All tests passed!');
    console.log('\n✅ Cloudinary is working correctly!');
    console.log('   - Package image upload: ✅');
    console.log('   - Profile picture upload: ✅');
    console.log('   - Signed URL generation: ✅');
    console.log('   - Image deletion: ✅');

  } catch (error: any) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run tests
testCloudinaryUpload();

