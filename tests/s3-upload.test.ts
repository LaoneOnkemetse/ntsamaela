/**
 * AWS S3 Upload Test Suite
 * 
 * Tests S3 file upload, download, and deletion functionality.
 * These are integration tests that require valid AWS credentials.
 * 
 * To run: npm test -- tests/s3-upload.test.ts
 * To skip (if AWS not configured): Tests will auto-skip if credentials missing
 * 
 * Note: These tests create and delete objects in S3 buckets and may incur minimal costs.
 */

import { 
  getS3Client, 
  getAWSConfig 
} from '../apps/api/src/services/aws/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { hasAWSCredentials } from './aws-connection.test';
import crypto from 'crypto';

// Skip tests if AWS credentials are not configured
const describeIf = hasAWSCredentials ? describe : describe.skip;

// Helper function to create test file content
function createTestFile(content: string = 'test content'): Buffer {
  return Buffer.from(content, 'utf-8');
}

// Helper function to generate unique test key
function generateTestKey(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${prefix}/${timestamp}-${random}.txt`;
}

describeIf('AWS S3 Upload Integration Tests', () => {
  let s3Client: S3Client;
  let config: ReturnType<typeof getAWSConfig>;
  let testKeys: string[] = []; // Track created objects for cleanup

  beforeAll(() => {
    s3Client = getS3Client();
    config = getAWSConfig();
  });

  afterAll(async () => {
    // Cleanup: Delete all test objects
    for (const key of testKeys) {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: config.s3Buckets.documents,
          Key: key,
        });
        await s3Client.send(deleteCommand);
      } catch (error) {
        // Ignore cleanup errors
        console.warn(`Failed to cleanup test object: ${key}`);
      }
    }
  });

  describe('S3 Bucket Access', () => {
    it('should list objects in documents bucket', async () => {
      const command = new ListObjectsV2Command({
        Bucket: config.s3Buckets.documents,
        MaxKeys: 10,
      });

      try {
        const response = await s3Client.send(command);
        
        // Contents may be undefined if bucket is empty
        expect(response).toBeDefined();
        if (response.Contents) {
          expect(Array.isArray(response.Contents)).toBe(true);
        }
        
        console.log(`✅ Successfully listed objects in bucket '${config.s3Buckets.documents}'`);
        console.log(`   Objects found: ${response.Contents?.length || 0}`);
      } catch (error: any) {
        if (error.name === 'NoSuchBucket') {
          throw new Error(`Bucket '${config.s3Buckets.documents}' does not exist. Please create it first.`);
        }
        throw error;
      }
    }, 10000);

    it('should verify access to all required buckets', async () => {
      const buckets = [
        config.s3Buckets.documents,
        config.s3Buckets.packages,
        config.s3Buckets.uploads,
      ];

      for (const bucket of buckets) {
        try {
          const command = new ListObjectsV2Command({
            Bucket: bucket,
            MaxKeys: 1,
          });
          
          await s3Client.send(command);
          console.log(`✅ Bucket '${bucket}' is accessible`);
        } catch (error: any) {
          if (error.name === 'NoSuchBucket') {
            console.warn(`⚠️  Bucket '${bucket}' does not exist`);
          } else if (error.name === 'AccessDenied') {
            throw new Error(`Access denied to bucket '${bucket}'. Check IAM permissions.`);
          } else {
            throw error;
          }
        }
      }
    }, 15000);
  });

  describe('File Upload (PutObject)', () => {
    it('should upload a file to S3', async () => {
      const testKey = generateTestKey('upload-test');
      const testContent = 'This is a test file for S3 upload';
      const testFile = createTestFile(testContent);

      const command = new PutObjectCommand({
        Bucket: config.s3Buckets.documents,
        Key: testKey,
        Body: testFile,
        ContentType: 'text/plain',
        Metadata: {
          'test-purpose': 'integration-test',
          'uploaded-at': new Date().toISOString(),
        },
      });

      const response = await s3Client.send(command);
      
      expect(response).toHaveProperty('ETag');
      expect(response.ETag).toBeTruthy();
      
      testKeys.push(testKey);
      
      console.log(`✅ File uploaded successfully`);
      console.log(`   Key: ${testKey}`);
      console.log(`   ETag: ${response.ETag}`);
    }, 15000);

    it('should upload file with custom metadata', async () => {
      const testKey = generateTestKey('metadata-test');
      const testFile = createTestFile('Test content with metadata');
      const customMetadata = {
        'user-id': 'test-user-123',
        'file-type': 'document',
        'uploaded-by': 'test-suite',
      };

      const command = new PutObjectCommand({
        Bucket: config.s3Buckets.documents,
        Key: testKey,
        Body: testFile,
        ContentType: 'text/plain',
        Metadata: customMetadata,
      });

      await s3Client.send(command);
      testKeys.push(testKey);

      // Verify metadata was stored
      const headCommand = new HeadObjectCommand({
        Bucket: config.s3Buckets.documents,
        Key: testKey,
      });

      const headResponse = await s3Client.send(headCommand);
      
      expect(headResponse.Metadata).toBeDefined();
      expect(headResponse.Metadata?.['user-id']).toBe('test-user-123');
      expect(headResponse.Metadata?.['file-type']).toBe('document');
      
      console.log(`✅ File uploaded with metadata`);
    }, 15000);

    it('should upload binary file (image)', async () => {
      const testKey = generateTestKey('image-test') + '.jpg';
      // Create a minimal valid JPEG
      const jpegHex = 'FFD8FFE000104A46494600010100000100010000FFDB004300080606070605080707070909080A0C140D0C0B0B0C1912130F141D1A1F1E1D1A1C1C20242E2720222C231C1C2837292C30313434341F27393D38323C2E333432FFC0000B080001000101011100FFC4001F0000010501010101010100000000000000000102030405060708090A0BFFC400B5100002010303020403050504040000017D01020300041105122131410613516107227114328191A1082342B1C11552D1F02433627282090A161718191A25262728292A3435363738393A434445464748494A535455565758595A636465666768696A737475767778797A838485868788898A92939495969798999AA2A3A4A5A6A7A8A9AAB2B3B4B5B6B7B8B9BAC2C3C4C5C6C7C8C9CAD2D3D4D5D6D7D8D9DAE1E2E3E4E5E6E7E8E9EAF1F2F3F4F5F6F7F8F9FAFFDA0008010100003F00';
      const imageBuffer = Buffer.from(jpegHex, 'hex');

      const command = new PutObjectCommand({
        Bucket: config.s3Buckets.documents,
        Key: testKey,
        Body: imageBuffer,
        ContentType: 'image/jpeg',
        Metadata: {
          'file-type': 'image',
          'test': 'true',
        },
      });

      const response = await s3Client.send(command);
      
      expect(response.ETag).toBeTruthy();
      testKeys.push(testKey);
      
      console.log(`✅ Image uploaded successfully`);
      console.log(`   Key: ${testKey}`);
      console.log(`   Size: ${imageBuffer.length} bytes`);
    }, 15000);
  });

  describe('File Download (GetObject)', () => {
    it('should download a file from S3', async () => {
      // First upload a test file
      const testKey = generateTestKey('download-test');
      const originalContent = 'This is the original content';
      const testFile = createTestFile(originalContent);

      const putCommand = new PutObjectCommand({
        Bucket: config.s3Buckets.documents,
        Key: testKey,
        Body: testFile,
        ContentType: 'text/plain',
      });

      await s3Client.send(putCommand);
      testKeys.push(testKey);

      // Now download it
      const getCommand = new GetObjectCommand({
        Bucket: config.s3Buckets.documents,
        Key: testKey,
      });

      const response = await s3Client.send(getCommand);
      
      expect(response.Body).toBeDefined();
      
      // Convert stream to buffer and compare
      const chunks: Uint8Array[] = [];
      if (response.Body) {
        for await (const chunk of response.Body as any) {
          chunks.push(chunk);
        }
      }
      const downloadedContent = Buffer.concat(chunks).toString('utf-8');
      
      expect(downloadedContent).toBe(originalContent);
      
      console.log(`✅ File downloaded successfully`);
      console.log(`   Content matches: ${downloadedContent === originalContent}`);
    }, 15000);

    it('should retrieve file metadata', async () => {
      const testKey = generateTestKey('metadata-download-test');
      const testFile = createTestFile('Test content');
      const uploadTime = new Date().toISOString();

      const putCommand = new PutObjectCommand({
        Bucket: config.s3Buckets.documents,
        Key: testKey,
        Body: testFile,
        ContentType: 'text/plain',
        Metadata: {
          'uploaded-at': uploadTime,
        },
      });

      await s3Client.send(putCommand);
      testKeys.push(testKey);

      // Get object metadata
      const headCommand = new HeadObjectCommand({
        Bucket: config.s3Buckets.documents,
        Key: testKey,
      });

      const response = await s3Client.send(headCommand);
      
      expect(response.ContentType).toBe('text/plain');
      expect(response.ContentLength).toBe(testFile.length);
      expect(response.Metadata).toBeDefined();
      expect(response.Metadata?.['uploaded-at']).toBe(uploadTime);
      
      console.log(`✅ File metadata retrieved`);
      console.log(`   Content-Type: ${response.ContentType}`);
      console.log(`   Content-Length: ${response.ContentLength}`);
    }, 15000);
  });

  describe('Presigned URLs', () => {
    it('should generate presigned URL for file access', async () => {
      const testKey = generateTestKey('presigned-test');
      const testFile = createTestFile('Content for presigned URL test');

      // Upload file first
      const putCommand = new PutObjectCommand({
        Bucket: config.s3Buckets.documents,
        Key: testKey,
        Body: testFile,
      });

      await s3Client.send(putCommand);
      testKeys.push(testKey);

      // Generate presigned URL
      const getCommand = new GetObjectCommand({
        Bucket: config.s3Buckets.documents,
        Key: testKey,
      });

      const expiresIn = 3600; // 1 hour
      const presignedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn });
      
      expect(presignedUrl).toBeTruthy();
      expect(presignedUrl).toContain('https://');
      expect(presignedUrl).toContain(config.s3Buckets.documents);
      expect(presignedUrl).toContain('X-Amz-Signature');
      
      console.log(`✅ Presigned URL generated`);
      console.log(`   URL: ${presignedUrl.substring(0, 100)}...`);
      console.log(`   Expires in: ${expiresIn} seconds`);
    }, 15000);

    it('should generate presigned URL with custom expiration', async () => {
      const testKey = generateTestKey('presigned-expiry-test');
      const testFile = createTestFile('Test content');

      const putCommand = new PutObjectCommand({
        Bucket: config.s3Buckets.documents,
        Key: testKey,
        Body: testFile,
      });

      await s3Client.send(putCommand);
      testKeys.push(testKey);

      const getCommand = new GetObjectCommand({
        Bucket: config.s3Buckets.documents,
        Key: testKey,
      });

      const customExpiry = 1800; // 30 minutes
      const presignedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: customExpiry });
      
      expect(presignedUrl).toBeTruthy();
      expect(presignedUrl).toContain('X-Amz-Expires');
      
      console.log(`✅ Presigned URL with custom expiry generated`);
    }, 15000);
  });

  describe('File Deletion (DeleteObject)', () => {
    it('should delete a file from S3', async () => {
      // First upload a test file
      const testKey = generateTestKey('delete-test');
      const testFile = createTestFile('This file will be deleted');

      const putCommand = new PutObjectCommand({
        Bucket: config.s3Buckets.documents,
        Key: testKey,
        Body: testFile,
      });

      await s3Client.send(putCommand);

      // Verify it exists
      const headCommand = new HeadObjectCommand({
        Bucket: config.s3Buckets.documents,
        Key: testKey,
      });

      await s3Client.send(headCommand);

      // Delete it
      const deleteCommand = new DeleteObjectCommand({
        Bucket: config.s3Buckets.documents,
        Key: testKey,
      });

      const response = await s3Client.send(deleteCommand);
      
      // Verify it's deleted
      try {
        await s3Client.send(headCommand);
        fail('Expected NoSuchKey or NotFound error');
      } catch (error: any) {
        // Different SDK versions may return different error names
        expect(['NoSuchKey', 'NotFound']).toContain(error.name);
      }
      
      console.log(`✅ File deleted successfully`);
    }, 15000);

    it('should handle deletion of non-existent file gracefully', async () => {
      const nonExistentKey = 'non-existent-file-' + Date.now() + '.txt';

      const deleteCommand = new DeleteObjectCommand({
        Bucket: config.s3Buckets.documents,
        Key: nonExistentKey,
      });

      // S3 DeleteObject doesn't throw error for non-existent objects
      const response = await s3Client.send(deleteCommand);
      
      expect(response).toBeDefined();
      console.log(`✅ Non-existent file deletion handled gracefully`);
    }, 10000);
  });

  describe('Multiple Bucket Operations', () => {
    it('should upload to documents bucket', async () => {
      const testKey = generateTestKey('documents-bucket-test');
      const testFile = createTestFile('Documents bucket test');

      const command = new PutObjectCommand({
        Bucket: config.s3Buckets.documents,
        Key: testKey,
        Body: testFile,
      });

      await s3Client.send(command);
      testKeys.push(testKey);
      
      console.log(`✅ Uploaded to documents bucket`);
    }, 15000);

    it('should upload to packages bucket', async () => {
      const testKey = generateTestKey('packages-bucket-test');
      const testFile = createTestFile('Packages bucket test');

      const command = new PutObjectCommand({
        Bucket: config.s3Buckets.packages,
        Key: testKey,
        Body: testFile,
      });

      await s3Client.send(command);
      
      // Cleanup
      const deleteCommand = new DeleteObjectCommand({
        Bucket: config.s3Buckets.packages,
        Key: testKey,
      });
      await s3Client.send(deleteCommand);
      
      console.log(`✅ Uploaded to packages bucket`);
    }, 15000);

    it('should upload to uploads bucket', async () => {
      const testKey = generateTestKey('uploads-bucket-test');
      const testFile = createTestFile('Uploads bucket test');

      const command = new PutObjectCommand({
        Bucket: config.s3Buckets.uploads,
        Key: testKey,
        Body: testFile,
      });

      await s3Client.send(command);
      
      // Cleanup
      const deleteCommand = new DeleteObjectCommand({
        Bucket: config.s3Buckets.uploads,
        Key: testKey,
      });
      await s3Client.send(deleteCommand);
      
      console.log(`✅ Uploaded to uploads bucket`);
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle invalid bucket name', async () => {
      const invalidBucket = 'non-existent-bucket-' + Date.now();
      const testKey = 'test-key.txt';
      const testFile = createTestFile('Test');

      const command = new PutObjectCommand({
        Bucket: invalidBucket,
        Key: testKey,
        Body: testFile,
      });

      try {
        await s3Client.send(command);
        fail('Expected NoSuchBucket error');
      } catch (error: any) {
        expect(error.name).toBe('NoSuchBucket');
        console.log(`✅ Invalid bucket correctly rejected: ${error.name}`);
      }
    }, 10000);

    it('should handle access denied errors', async () => {
      // This test assumes the bucket exists but we don't have write permissions
      // In practice, this would test with a bucket we can't access
      const testKey = 'access-denied-test.txt';
      const testFile = createTestFile('Test');

      // Try to access a bucket that might not have write permissions
      // This is a placeholder - actual test would need a bucket with restricted access
      console.log('⚠️  Access denied test requires a bucket with restricted permissions');
    });
  });

  describe('Performance Tests', () => {
    it('should upload file within reasonable time', async () => {
      const testKey = generateTestKey('performance-test');
      const testFile = createTestFile('Performance test content');
      const startTime = Date.now();

      const command = new PutObjectCommand({
        Bucket: config.s3Buckets.documents,
        Key: testKey,
        Body: testFile,
      });

      await s3Client.send(command);
      const duration = Date.now() - startTime;
      
      testKeys.push(testKey);
      
      // Should complete within 5 seconds for small file
      expect(duration).toBeLessThan(5000);
      console.log(`✅ Upload completed in ${duration}ms`);
    }, 10000);

    it('should handle concurrent uploads', async () => {
      const uploads = [];
      const numUploads = 5;

      for (let i = 0; i < numUploads; i++) {
        const testKey = generateTestKey(`concurrent-${i}`);
        const testFile = createTestFile(`Concurrent upload ${i}`);
        testKeys.push(testKey);

        const command = new PutObjectCommand({
          Bucket: config.s3Buckets.documents,
          Key: testKey,
          Body: testFile,
        });

        uploads.push(s3Client.send(command));
      }

      const results = await Promise.all(uploads);
      
      expect(results).toHaveLength(numUploads);
      results.forEach((result, index) => {
        expect(result.ETag).toBeTruthy();
      });
      
      console.log(`✅ ${numUploads} concurrent uploads completed successfully`);
    }, 20000);
  });
});

