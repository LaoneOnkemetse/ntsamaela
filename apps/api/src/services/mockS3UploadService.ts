// Mock S3 Upload Service for development
export class MockS3UploadService {
  async uploadPackageImage(file: any, userId: string, _packageId?: string) {
    // Mock implementation - return a mock URL
    const mockUrl = `https://mock-s3-bucket.com/packages/${userId}/package-${Date.now()}.jpg`;
    console.log(`Mock: Uploaded package image to ${mockUrl}`);
    return {
      url: mockUrl,
      key: `packages/${userId}/package-${Date.now()}.jpg`,
    };
  }

  async uploadVerificationImage(file: any, userId: string, type: string) {
    // Mock implementation - return a mock URL
    const mockUrl = `https://mock-s3-bucket.com/verification/${userId}/${type}-${Date.now()}.jpg`;
    console.log(`Mock: Uploaded verification image to ${mockUrl}`);
    return mockUrl;
  }

  async uploadDriverImage(file: any, userId: string) {
    // Mock implementation - return a mock URL
    const mockUrl = `https://mock-s3-bucket.com/driver/${userId}/car-${Date.now()}.jpg`;
    console.log(`Mock: Uploaded driver image to ${mockUrl}`);
    return mockUrl;
  }

  async uploadProfilePicture(file: any, userId: string) {
    // Mock implementation - return a mock URL
    const mockUrl = `https://mock-s3-bucket.com/profiles/${userId}/profile-${Date.now()}.jpg`;
    console.log(`Mock: Uploaded profile picture to ${mockUrl}`);
    return {
      url: mockUrl,
      key: `profiles/${userId}/profile-${Date.now()}.jpg`,
    };
  }

  async getPackageImage(key: string) {
    // Mock implementation - return a mock image URL
    const mockUrl = `https://mock-s3-bucket.com/${key}`;
    console.log(`Mock: Retrieved package image from ${mockUrl}`);
    return { url: mockUrl };
  }

  async getSignedUrl(key: string, expiresIn: number) {
    const url = `https://mock-s3-bucket.com/${key}?expiresIn=${expiresIn}`;
    console.log(`Mock: Generated signed URL ${url}`);
    return url;
  }

  async deleteImage(key: string) {
    console.log(`Mock: Deleted image with key ${key}`);
    return { success: true };
  }
}

export const s3UploadService = new MockS3UploadService();
