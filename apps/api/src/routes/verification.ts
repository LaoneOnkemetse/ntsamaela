import { Router } from "express";
import { body } from "express-validator";
import { VerificationController } from "../controllers/verificationController";
import { requireAuth } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import multer from "multer";

const router = Router();
const verificationController = new VerificationController();

// Configure multer for document uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 3, // Front, back, and selfie images
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed."));
    }
  },
});

// Validation rules
const submitVerificationValidation = [
  body("documentType")
    .optional()
    .isIn(["DRIVERS_LICENSE", "NATIONAL_ID", "PASSPORT", "ID_CARD"])
    .withMessage("Valid document type is required"),
];

// Routes
router.post(
  "/submit",
  requireAuth,
  upload.fields([
    { name: "frontImage", maxCount: 1 },
    { name: "backImage", maxCount: 1 },
    { name: "selfieImage", maxCount: 1 },
  ]),
  submitVerificationValidation,
  validateRequest,
  verificationController.submitVerification.bind(verificationController),
);

router.get(
  "/status/:userId",
  requireAuth,
  verificationController.getVerificationStatus.bind(verificationController),
);

router.get(
  "/my-status",
  requireAuth,
  verificationController.getMyVerificationStatus.bind(verificationController),
);

// Error handling middleware for multer
router.use((_error: any, req: any, res: any, next: any) => {
  if (_error instanceof multer.MulterError) {
    if (_error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: {
          code: "FILE_TOO_LARGE",
          message: "File size exceeds 10MB limit",
        },
      });
    }
    if (_error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        error: {
          code: "TOO_MANY_FILES",
          message: "Too many files uploaded",
        },
      });
    }
  }

  if (
    _error.message ===
    "Invalid file type. Only JPEG, PNG, and WebP are allowed."
  ) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_FILE_TYPE",
        message: _error.message,
      },
    });
  }

  next(_error);
});

export default router;
