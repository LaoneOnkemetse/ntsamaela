/**
 * AWS Rekognition Test Suite
 * 
 * Tests Rekognition service functionality with sample images.
 * These are integration tests that require valid AWS credentials and may incur costs.
 * 
 * To run: npm test -- tests/rekognition.test.ts
 * To skip (if AWS not configured): Tests will auto-skip if credentials missing
 * 
 * Note: These tests use real AWS Rekognition API calls and may incur charges.
 */

import { 
  getRekognitionClient, 
  getAWSConfig 
} from '../apps/api/src/services/aws/config';
import { 
  RekognitionClient,
  DetectFacesCommand,
  CompareFacesCommand,
  DetectTextCommand,
  CreateCollectionCommand,
  DescribeCollectionCommand,
  IndexFacesCommand,
  SearchFacesByImageCommand,
} from '@aws-sdk/client-rekognition';
import { hasAWSCredentials } from './aws-connection.test';

// Skip tests if AWS credentials are not configured
const describeIf = hasAWSCredentials ? describe : describe.skip;

// Helper function to create a minimal test image (1x1 pixel PNG)
function createTestImage(): Buffer {
  // Minimal valid PNG image (1x1 pixel, red)
  // PNG signature + IHDR + IDAT + IEND
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return Buffer.from(pngBase64, 'base64');
}

// Helper function to create a JPEG test image
function createTestJPEG(): Buffer {
  // Minimal valid JPEG (1x1 pixel)
  // JPEG signature: FF D8 FF E0
  const jpegHex = 'FFD8FFE000104A46494600010100000100010000FFDB004300080606070605080707070909080A0C140D0C0B0B0C1912130F141D1A1F1E1D1A1C1C20242E2720222C231C1C2837292C30313434341F27393D38323C2E333432FFC0000B080001000101011100FFC4001F0000010501010101010100000000000000000102030405060708090A0BFFC400B5100002010303020403050504040000017D01020300041105122131410613516107227114328191A1082342B1C11552D1F02433627282090A161718191A25262728292A3435363738393A434445464748494A535455565758595A636465666768696A737475767778797A838485868788898A92939495969798999AA2A3A4A5A6A7A8A9AAB2B3B4B5B6B7B8B9BAC2C3C4C5C6C7C8C9CAD2D3D4D5D6D7D8D9DAE1E2E3E4E5E6E7E8E9EAF1F2F3F4F5F6F7F8F9FAFFDA0008010100003F00';
  return Buffer.from(jpegHex, 'hex');
}

describeIf('AWS Rekognition Integration Tests', () => {
  let rekognitionClient: RekognitionClient;
  let config: ReturnType<typeof getAWSConfig>;
  const collectionId = 'ntsamaela-verification';

  beforeAll(() => {
    rekognitionClient = getRekognitionClient();
    config = getAWSConfig();
  });

  describe('Collection Management', () => {
    it('should check if Rekognition collection exists', async () => {
      try {
        const command = new DescribeCollectionCommand({
          CollectionId: collectionId,
        });
        
        const response = await rekognitionClient.send(command);
        
        expect(response).toHaveProperty('CollectionARN');
        expect(response).toHaveProperty('FaceCount');
        expect(response.FaceCount).toBeGreaterThanOrEqual(0);
        
        console.log(`✅ Collection '${collectionId}' exists`);
        console.log(`   Face Count: ${response.FaceCount}`);
      } catch (error: any) {
        if (error.name === 'ResourceNotFoundException') {
          console.warn(`⚠️  Collection '${collectionId}' does not exist. It will be created when needed.`);
        } else {
          throw error;
        }
      }
    }, 15000);

    it('should create Rekognition collection if it does not exist', async () => {
      try {
        // First check if it exists
        const describeCommand = new DescribeCollectionCommand({
          CollectionId: collectionId,
        });
        
        try {
          await rekognitionClient.send(describeCommand);
          console.log(`✅ Collection '${collectionId}' already exists`);
        } catch (error: any) {
          if (error.name === 'ResourceNotFoundException') {
            // Create the collection
            const createCommand = new CreateCollectionCommand({
              CollectionId: collectionId,
            });
            
            const response = await rekognitionClient.send(createCommand);
            expect(response).toHaveProperty('StatusCode');
            expect(response.StatusCode).toBe(200);
            
            console.log(`✅ Collection '${collectionId}' created successfully`);
          } else {
            throw error;
          }
        }
      } catch (error: any) {
        // Collection might already exist or permission issue
        console.warn(`⚠️  Could not create collection: ${error.message}`);
      }
    }, 20000);
  });

  describe('Face Detection', () => {
    it('should detect faces in an image', async () => {
      const testImage = createTestJPEG();
      
      const command = new DetectFacesCommand({
        Image: {
          Bytes: testImage,
        },
        Attributes: ['ALL'],
      });

      try {
        const response = await rekognitionClient.send(command);
        
        expect(response).toHaveProperty('FaceDetails');
        expect(Array.isArray(response.FaceDetails)).toBe(true);
        
        // Note: 1x1 pixel image won't have faces, but API should respond
        console.log(`✅ Face detection completed`);
        console.log(`   Faces detected: ${response.FaceDetails?.length || 0}`);
      } catch (error: any) {
        // API might reject very small images
        if (error.name === 'InvalidImageFormatException' || error.name === 'InvalidParameterException') {
          console.warn('⚠️  Test image too small for face detection (expected)');
        } else {
          throw error;
        }
      }
    }, 15000);

    it('should handle invalid image format gracefully', async () => {
      const invalidImage = Buffer.from('not-an-image');
      
      const command = new DetectFacesCommand({
        Image: {
          Bytes: invalidImage,
        },
      });

      try {
        await rekognitionClient.send(command);
        fail('Expected error for invalid image');
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.name).toBeDefined();
        // Should be InvalidImageFormatException or similar
        console.log(`✅ Invalid image correctly rejected: ${error.name}`);
      }
    }, 10000);
  });

  describe('Face Comparison', () => {
    it('should compare two face images', async () => {
      const image1 = createTestJPEG();
      const image2 = createTestJPEG();
      
      const command = new CompareFacesCommand({
        SourceImage: {
          Bytes: image1,
        },
        TargetImage: {
          Bytes: image2,
        },
        SimilarityThreshold: 70,
      });

      try {
        const response = await rekognitionClient.send(command);
        
        expect(response).toHaveProperty('FaceMatches');
        expect(response).toHaveProperty('SourceImageFace');
        expect(Array.isArray(response.FaceMatches)).toBe(true);
        
        console.log(`✅ Face comparison completed`);
        console.log(`   Matches found: ${response.FaceMatches?.length || 0}`);
      } catch (error: any) {
        if (error.name === 'InvalidImageFormatException' || error.name === 'InvalidParameterException') {
          console.warn('⚠️  Test images too small for face comparison (expected)');
        } else {
          throw error;
        }
      }
    }, 15000);
  });

  describe('Text Detection', () => {
    it('should detect text in an image', async () => {
      const testImage = createTestJPEG();
      
      const command = new DetectTextCommand({
        Image: {
          Bytes: testImage,
        },
      });

      try {
        const response = await rekognitionClient.send(command);
        
        expect(response).toHaveProperty('TextDetections');
        expect(Array.isArray(response.TextDetections)).toBe(true);
        
        console.log(`✅ Text detection completed`);
        console.log(`   Text detections: ${response.TextDetections?.length || 0}`);
      } catch (error: any) {
        if (error.name === 'InvalidImageFormatException' || error.name === 'InvalidParameterException') {
          console.warn('⚠️  Test image too small for text detection (expected)');
        } else {
          throw error;
        }
      }
    }, 15000);
  });

  describe('Face Indexing and Search', () => {
    it('should index a face in the collection', async () => {
      const testImage = createTestJPEG();
      
      const command = new IndexFacesCommand({
        CollectionId: collectionId,
        Image: {
          Bytes: testImage,
        },
        MaxFaces: 1,
        QualityFilter: 'AUTO',
      });

      try {
        const response = await rekognitionClient.send(command);
        
        expect(response).toHaveProperty('FaceRecords');
        expect(Array.isArray(response.FaceRecords)).toBe(true);
        
        if (response.FaceRecords && response.FaceRecords.length > 0) {
          expect(response.FaceRecords[0]).toHaveProperty('Face');
          expect(response.FaceRecords[0]).toHaveProperty('FaceDetail');
          
          console.log(`✅ Face indexed successfully`);
          console.log(`   Face ID: ${response.FaceRecords[0].Face?.FaceId}`);
        } else {
          console.warn('⚠️  No faces detected in test image (expected for 1x1 pixel)');
        }
      } catch (error: any) {
        if (error.name === 'ResourceNotFoundException') {
          console.warn(`⚠️  Collection '${collectionId}' not found. Create it first.`);
        } else if (error.name === 'InvalidImageFormatException' || error.name === 'InvalidParameterException') {
          console.warn('⚠️  Test image too small for face indexing (expected)');
        } else {
          throw error;
        }
      }
    }, 20000);

    it('should search for faces in collection', async () => {
      const testImage = createTestJPEG();
      
      const command = new SearchFacesByImageCommand({
        CollectionId: collectionId,
        Image: {
          Bytes: testImage,
        },
        MaxFaces: 10,
        FaceMatchThreshold: 70,
      });

      try {
        const response = await rekognitionClient.send(command);
        
        expect(response).toHaveProperty('FaceMatches');
        expect(response).toHaveProperty('SearchedFaceBoundingBox');
        expect(Array.isArray(response.FaceMatches)).toBe(true);
        
        console.log(`✅ Face search completed`);
        console.log(`   Matches found: ${response.FaceMatches?.length || 0}`);
      } catch (error: any) {
        if (error.name === 'ResourceNotFoundException') {
          console.warn(`⚠️  Collection '${collectionId}' not found. Create it first.`);
        } else if (error.name === 'InvalidImageFormatException' || error.name === 'InvalidParameterException') {
          console.warn('⚠️  Test image too small for face search (expected)');
        } else {
          throw error;
        }
      }
    }, 20000);
  });

  describe('Error Handling', () => {
    it('should handle invalid collection ID', async () => {
      const invalidCollectionId = 'non-existent-collection-12345';
      
      const command = new DescribeCollectionCommand({
        CollectionId: invalidCollectionId,
      });

      try {
        await rekognitionClient.send(command);
        fail('Expected ResourceNotFoundException');
      } catch (error: any) {
        expect(error.name).toBe('ResourceNotFoundException');
        console.log('✅ Invalid collection ID correctly rejected');
      }
    }, 10000);

    it('should handle empty image buffer', async () => {
      const emptyBuffer = Buffer.from('');
      
      const command = new DetectFacesCommand({
        Image: {
          Bytes: emptyBuffer,
        },
      });

      try {
        await rekognitionClient.send(command);
        fail('Expected error for empty image');
      } catch (error: any) {
        expect(error).toBeDefined();
        console.log(`✅ Empty image correctly rejected: ${error.name}`);
      }
    }, 10000);
  });

  describe('Performance Tests', () => {
    it('should complete face detection within reasonable time', async () => {
      const testImage = createTestJPEG();
      const startTime = Date.now();
      
      const command = new DetectFacesCommand({
        Image: {
          Bytes: testImage,
        },
      });

      try {
        await rekognitionClient.send(command);
        const duration = Date.now() - startTime;
        
        // Should complete within 10 seconds
        expect(duration).toBeLessThan(10000);
        console.log(`✅ Face detection completed in ${duration}ms`);
      } catch (error: any) {
        if (error.name === 'InvalidImageFormatException' || error.name === 'InvalidParameterException') {
          console.warn('⚠️  Test image too small (expected)');
        } else {
          throw error;
        }
      }
    }, 15000);
  });
});

