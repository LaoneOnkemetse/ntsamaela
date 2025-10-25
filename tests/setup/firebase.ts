// Mock Firebase services for testing
export function mockFirebase() {
  // Mock Firebase Admin SDK
  jest.mock('firebase-admin', () => ({
    initializeApp: jest.fn(),
    messaging: jest.fn(() => ({
      send: jest.fn().mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{
          success: true,
          messageId: 'test-message-id'
        }]
      }),
      sendMulticast: jest.fn().mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{
          success: true,
          messageId: 'test-message-id'
        }]
      })
    })),
    credential: {
      cert: jest.fn()
    }
  }));

  // Mock Firebase Cloud Messaging
  jest.mock('firebase-admin/messaging', () => ({
    getMessaging: jest.fn(() => ({
      send: jest.fn().mockResolvedValue('test-message-id'),
      sendMulticast: jest.fn().mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{
          success: true,
          messageId: 'test-message-id'
        }]
      })
    }))
  }));
}













