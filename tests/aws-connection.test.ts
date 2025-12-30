/**
 * AWS Connection Test Suite
 * 
 * Tests AWS credential validation and service connectivity.
 * These are integration tests that require valid AWS credentials.
 * 
 * To run: npm test -- tests/aws-connection.test.ts
 * To skip (if AWS not configured): npm test -- tests/aws-connection.test.ts --skip-aws
 */

import { 
  awsConfigService, 
  initializeAWS, 
  getAWSConfig,
  getRekognitionClient,
  getS3Client,
} from '../apps/api/src/services/aws/config';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

// Check if AWS credentials are configured
const hasAWSCredentials = 
  process.env.AWS_ACCESS_KEY_ID && 
  process.env.AWS_ACCESS_KEY_ID !== 'your-aws-access-key' &&
  process.env.AWS_SECRET_ACCESS_KEY && 
  process.env.AWS_SECRET_ACCESS_KEY !== 'your-aws-secret-key';

// Skip tests if AWS credentials are not configured
const describeIf = hasAWSCredentials ? describe : describe.skip;

describeIf('AWS Connection Tests', () => {
  beforeAll(() => {
    // Initialize AWS services
    try {
      initializeAWS();
    } catch (error) {
      console.warn('AWS initialization failed. Some tests may be skipped.');
    }
  });

  afterAll(() => {
    // Reset AWS config service after tests
    awsConfigService.reset();
  });

  describe('Environment Variable Validation', () => {
    it('should validate required AWS environment variables', () => {
      const validation = awsConfigService.validateEnvironment();
      
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');
      
      if (!validation.isValid) {
        console.warn('Validation errors:', validation.errors);
      }
      
      // In test environment, we expect validation to pass if credentials are set
      if (hasAWSCredentials) {
        expect(validation.isValid).toBe(true);
      }
    });

    it('should validate AWS Access Key ID format', () => {
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      
      if (accessKeyId && accessKeyId !== 'your-aws-access-key') {
        // Access Key ID should start with AKIA and be 20 characters
        expect(accessKeyId).toMatch(/^AKIA[0-9A-Z]{16}$/);
      }
    });

    it('should validate AWS region is set', () => {
      const region = process.env.AWS_REGION;
      
      if (hasAWSCredentials) {
        expect(region).toBeDefined();
        expect(region).not.toBe('');
        // Should be a valid AWS region format
        expect(region).toMatch(/^[a-z]{2}-[a-z]+-[0-9]$/);
      }
    });
  });

  describe('AWS Configuration Service', () => {
    it('should build AWS configuration from environment variables', () => {
      const config = awsConfigService.getConfig();
      
      expect(config).toHaveProperty('region');
      expect(config).toHaveProperty('accessKeyId');
      expect(config).toHaveProperty('secretAccessKey');
      expect(config).toHaveProperty('s3Buckets');
      expect(config).toHaveProperty('rekognition');
      
      expect(config.region).toBeTruthy();
      expect(config.accessKeyId).toBeTruthy();
      expect(config.secretAccessKey).toBeTruthy();
    });

    it('should initialize AWS services successfully', () => {
      expect(() => {
        initializeAWS();
      }).not.toThrow();
      
      expect(awsConfigService.isReady()).toBe(true);
    });

    it('should return S3 bucket configuration', () => {
      const config = getAWSConfig();
      
      expect(config.s3Buckets).toHaveProperty('documents');
      expect(config.s3Buckets).toHaveProperty('packages');
      expect(config.s3Buckets).toHaveProperty('uploads');
      
      expect(config.s3Buckets.documents).toBeTruthy();
      expect(config.s3Buckets.packages).toBeTruthy();
      expect(config.s3Buckets.uploads).toBeTruthy();
    });

    it('should return Rekognition collection configuration', () => {
      const config = getAWSConfig();
      
      expect(config.rekognition).toHaveProperty('collectionId');
      expect(config.rekognition.collectionId).toBeTruthy();
    });
  });

  describe('AWS Credential Validation', () => {
    it('should validate AWS credentials using STS', async () => {
      if (!hasAWSCredentials) {
        return; // Skip if no credentials
      }

      const config = getAWSConfig();
      const stsClient = new STSClient({
        region: config.region,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });

      try {
        const command = new GetCallerIdentityCommand({});
        const response = await stsClient.send(command);
        
        expect(response).toHaveProperty('Account');
        expect(response.Account).toBeTruthy();
        expect(response).toHaveProperty('Arn');
        expect(response.Arn).toBeTruthy();
        expect(response).toHaveProperty('UserId');
        expect(response.UserId).toBeTruthy();
        
        console.log('✅ AWS Credentials Valid');
        console.log(`   Account ID: ${response.Account}`);
        console.log(`   User ARN: ${response.Arn}`);
      } catch (error: any) {
        throw new Error(`AWS credential validation failed: ${error.message}`);
      }
    }, 10000); // 10 second timeout for AWS API call

    it('should detect invalid credentials', async () => {
      // Test with invalid credentials
      const invalidConfig = {
        region: 'us-east-1',
        accessKeyId: 'AKIAINVALIDKEY',
        secretAccessKey: 'invalidSecretKey',
      };

      const stsClient = new STSClient({
        region: invalidConfig.region,
        credentials: {
          accessKeyId: invalidConfig.accessKeyId,
          secretAccessKey: invalidConfig.secretAccessKey,
        },
      });

      try {
        const command = new GetCallerIdentityCommand({});
        await stsClient.send(command);
        // Should not reach here
        fail('Expected error for invalid credentials');
      } catch (error: any) {
        // Expected to fail
        expect(error).toBeDefined();
        expect(error.name).toBeDefined();
      }
    }, 10000);
  });

  describe('AWS Client Initialization', () => {
    it('should create Rekognition client', () => {
      const client = getRekognitionClient();
      
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(Object);
    });

    it('should create S3 client', () => {
      const client = getS3Client();
      
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(Object);
    });

    it('should reuse clients (singleton pattern)', () => {
      const client1 = getRekognitionClient();
      const client2 = getRekognitionClient();
      
      // Should return the same instance
      expect(client1).toBe(client2);
    });
  });

  describe('Region Configuration', () => {
    it('should use configured AWS region', () => {
      const config = getAWSConfig();
      const expectedRegion = process.env.AWS_REGION || 'us-east-1';
      
      expect(config.region).toBe(expectedRegion);
    });

    it('should return region-specific settings', () => {
      const settings = awsConfigService.getRegionSettings();
      
      expect(settings).toBeDefined();
      expect(typeof settings).toBe('object');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing credentials gracefully', () => {
      // Temporarily remove credentials
      const originalKey = process.env.AWS_ACCESS_KEY_ID;
      const originalSecret = process.env.AWS_SECRET_ACCESS_KEY;
      
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      
      // Reset service
      awsConfigService.reset();
      
      const validation = awsConfigService.validateEnvironment();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      
      // Restore credentials
      process.env.AWS_ACCESS_KEY_ID = originalKey;
      process.env.AWS_SECRET_ACCESS_KEY = originalSecret;
      
      // Re-initialize
      awsConfigService.reset();
      initializeAWS();
    });

    it('should handle invalid region gracefully', () => {
      const originalRegion = process.env.AWS_REGION;
      process.env.AWS_REGION = 'invalid-region';
      
      awsConfigService.reset();
      const validation = awsConfigService.validateEnvironment();
      
      // Should have warnings about invalid region
      expect(validation.warnings.length).toBeGreaterThan(0);
      
      // Restore
      process.env.AWS_REGION = originalRegion;
      awsConfigService.reset();
      initializeAWS();
    });
  });
});

// Export for use in other test files
export { hasAWSCredentials };

