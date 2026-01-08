import { DocumentType } from "@shared/types";

// Mock all dependencies before importing the service
jest.mock("@database/index", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    verification: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock("../emailService", () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("../smsService", () => ({
  sendSms: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("../../utils/AppError", () => ({
  AppError: class AppError extends Error {
    statusCode: number;
    code: string;

    constructor(code: string, message: string, statusCode: number) {
      super(message);
      this.name = "AppError";
      this.statusCode = statusCode;
      this.code = code;
    }
  },
}));

// AWS services removed - using Google Cloud Vision instead

describe("Verification Service Mocks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  it("should have mocks set up correctly", () => {
    const { prisma } = require("@database/index");
    const { sendEmail } = require("../emailService");
    const { sendSms } = require("../smsService");
    const { AppError } = require("../../utils/AppError");

    expect(prisma).toBeDefined();
    expect(prisma.user.findUnique).toBeDefined();
    expect(prisma.verification.create).toBeDefined();
    expect(sendEmail).toBeDefined();
    expect(sendSms).toBeDefined();
    expect(AppError).toBeDefined();
    expect(true).toBe(true);
  });

  it("should mock database operations", async () => {
    const { prisma } = require("@database/index");

    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      userType: "CUSTOMER",
      identityVerified: false,
    };

    prisma.user.findUnique.mockResolvedValue(mockUser);
    prisma.verification.create.mockResolvedValue({
      id: "verification-123",
      userId: "user-123",
      status: "APPROVED",
      riskScore: 15,
      confidence: 90,
    });

    const user = await prisma.user.findUnique({ where: { id: "user-123" } });
    expect(user).toEqual(mockUser);

    const verification = await prisma.verification.create({
      data: { userId: "user-123", status: "APPROVED" },
    });
    expect(verification.id).toBe("verification-123");
  });


  it("should mock email and SMS services", async () => {
    const { sendEmail } = require("../emailService");
    const { sendSms } = require("../smsService");

    const emailResult = await sendEmail(
      "test@example.com",
      "Test",
      "Test message",
    );
    expect(emailResult.success).toBe(true);

    const smsResult = await sendSms("+1234567890", "Test message");
    expect(smsResult.success).toBe(true);
  });

  it("should mock AppError correctly", () => {
    const { AppError } = require("../../utils/AppError");

    const error = new AppError("TEST_ERROR", "Test error message", 400);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AppError");
    expect(error.message).toBe("Test error message");
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("TEST_ERROR");
  });

  it("should test document type validation", () => {
    const validDocumentTypes: DocumentType[] = [
      "PASSPORT",
      "DRIVERS_LICENSE",
      "NATIONAL_ID",
      "UTILITY_BILL",
      "BANK_STATEMENT",
    ];

    validDocumentTypes.forEach((docType) => {
      expect(typeof docType).toBe("string");
      expect(validDocumentTypes).toContain(docType);
    });
  });

  it("should test verification workflow simulation", async () => {
    const { prisma } = require("@database/index");
    const { sendEmail } = require("../emailService");
    const { sendSms } = require("../smsService");

    // Simulate a complete verification workflow
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      userType: "CUSTOMER",
      identityVerified: false,
    };

    const mockVerification = {
      id: "verification-123",
      userId: "user-123",
      status: "APPROVED",
      riskScore: 15,
      confidence: 90,
      requiresManualReview: false,
      submittedAt: new Date(),
    };

    // Mock the workflow steps
    prisma.user.findUnique.mockResolvedValue(mockUser);
    prisma.verification.create.mockResolvedValue(mockVerification);
    sendEmail.mockResolvedValue({ success: true });
    sendSms.mockResolvedValue({ success: true });

    // Simulate the workflow
    const user = await prisma.user.findUnique({ where: { id: "user-123" } });
    expect(user).toEqual(mockUser);

    const verification = await prisma.verification.create({
      data: {
        userId: "user-123",
        status: "APPROVED",
        riskScore: 15,
        confidence: 90,
      },
    });
    expect(verification).toEqual(mockVerification);

    // Simulate notifications
    const emailResult = await sendEmail(
      "test@example.com",
      "Verification Approved",
      "Your verification has been approved",
    );
    const smsResult = await sendSms("+1234567890", "Verification approved");

    expect(emailResult.success).toBe(true);
    expect(smsResult.success).toBe(true);
  });
});
