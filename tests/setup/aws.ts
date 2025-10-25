// Mock AWS services for testing
export function mockAWS() {
  // Mock AWS SDK
  jest.mock('aws-sdk', () => ({
    Rekognition: jest.fn().mockImplementation(() => ({
      detectText: jest.fn().mockResolvedValue({
        TextDetections: [
          {
            DetectedText: 'MOCK_DOCUMENT_NUMBER',
            Confidence: 95.5
          }
        ]
      }),
      detectFaces: jest.fn().mockResolvedValue({
        FaceDetails: [
          {
            Confidence: 98.5,
            BoundingBox: {
              Width: 0.5,
              Height: 0.5,
              Left: 0.25,
              Top: 0.25
            }
          }
        ]
      }),
      compareFaces: jest.fn().mockResolvedValue({
        FaceMatches: [
          {
            Similarity: 95.5,
            Face: {
              Confidence: 98.5
            }
          }
        ]
      })
    })),
    S3: jest.fn().mockImplementation(() => ({
      upload: jest.fn().mockResolvedValue({
        Location: 'https://mock-s3-bucket.s3.amazonaws.com/mock-image.jpg'
      }),
      getSignedUrl: jest.fn().mockResolvedValue('https://mock-s3-bucket.s3.amazonaws.com/mock-signed-url')
    }))
  }));

  // Mock Google Cloud Vision
  jest.mock('@google-cloud/vision', () => ({
    ImageAnnotatorClient: jest.fn().mockImplementation(() => ({
      textDetection: jest.fn().mockResolvedValue([
        {
          fullTextAnnotation: {
            text: 'MOCK_OCR_TEXT\nDocument Number: 123456789\nName: John Doe\nDate of Birth: 1990-01-01'
          }
        }
      ]),
      faceDetection: jest.fn().mockResolvedValue([
        {
          faceAnnotations: [
            {
              confidence: 0.95,
              boundingPoly: {
                vertices: [
                  { x: 100, y: 100 },
                  { x: 200, y: 100 },
                  { x: 200, y: 200 },
                  { x: 100, y: 200 }
                ]
              }
            }
          ]
        }
      ])
    }))
  }));

  // Mock Firebase Admin
  jest.mock('firebase-admin', () => ({
    initializeApp: jest.fn(),
    getApps: jest.fn(() => []),
    credential: {
      applicationDefault: jest.fn()
    },
    storage: jest.fn(() => ({
      bucket: jest.fn(() => ({
        file: jest.fn(() => ({
          save: jest.fn().mockResolvedValue([{ publicUrl: 'https://mock-firebase-storage.com/mock-image.jpg' }]),
          getSignedUrl: jest.fn().mockResolvedValue(['https://mock-firebase-storage.com/mock-signed-url'])
        }))
      }))
    }))
  }));

  console.log('AWS services mocked for testing');
}
