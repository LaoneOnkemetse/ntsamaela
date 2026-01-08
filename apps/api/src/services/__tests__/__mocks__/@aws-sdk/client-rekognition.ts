// Manual mock for @aws-sdk/client-rekognition
// This file is used by Jest when the module doesn't exist

export const RekognitionClient = jest.fn().mockImplementation(() => ({
  send: jest.fn().mockImplementation((command) => {
    const commandName = command.constructor.name;

    switch (commandName) {
      case "AnalyzeDocumentCommand":
        return Promise.resolve({
          Blocks: [
            { BlockType: "LINE", Text: "PASSPORT" },
            { BlockType: "LINE", Text: "ABC123456" },
          ],
          DocumentMetadata: {
            Pages: 1,
          },
        });
      case "DetectFacesCommand":
        return Promise.resolve({
          FaceDetails: [
            {
              BoundingBox: { Width: 0.5, Height: 0.5, Left: 0.25, Top: 0.25 },
              Confidence: 95,
              Landmarks: [],
              Pose: { Roll: 0, Yaw: 0, Pitch: 0 },
              Quality: { Brightness: 50, Sharpness: 50 },
            },
          ],
        });
      case "CompareFacesCommand":
        return Promise.resolve({
          FaceMatches: [{ Similarity: 85 }],
          UnmatchedFaces: [],
        });
      case "DetectDocumentTextCommand":
        return Promise.resolve({
          TextDetections: [
            { DetectedText: "PASSPORT", Confidence: 95 },
            { DetectedText: "ABC123456", Confidence: 90 },
          ],
        });
      default:
        return Promise.resolve({});
    }
  }),
}));

export const AnalyzeDocumentCommand = jest.fn();
export const DetectFacesCommand = jest.fn();
export const CompareFacesCommand = jest.fn();
export const DetectDocumentTextCommand = jest.fn();

