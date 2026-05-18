import { Router } from "express";
import * as express from "express";
import { body } from "express-validator";
import { DriverController } from "../controllers/driverController";
import { requireAuth } from "../middleware/auth";
import { requireUserType } from "../middleware/userTypeMiddleware";
import { validateRequest } from "../middleware/validateRequest";
import multer from "multer";

const router = Router();
const driverController = new DriverController();

// Configure multer for car photo upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1,
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
const createDriverProfileValidation = [
  body("carRegistration")
    .notEmpty()
    .withMessage("Car registration is required"),
  body("carDescription").notEmpty().withMessage("Car description is required"),
  body("vehicleType")
    .optional()
    .isString()
    .withMessage("Vehicle type must be a string"),
  body("vehicleCapacity")
    .optional()
    .isString()
    .withMessage("Vehicle capacity must be a string"),
];

// Routes
router.post(
  "/profile",
  requireAuth,
  requireUserType(["DRIVER"]),
  upload.single("carPhoto"),
  createDriverProfileValidation,
  validateRequest,
  driverController.createDriverProfile.bind(driverController),
);

router.get(
  "/profile",
  requireAuth,
  requireUserType(["DRIVER"]),
  driverController.getDriverProfile.bind(driverController),
);

router.put(
  "/profile",
  requireAuth,
  requireUserType(["DRIVER"]),
  upload.single("carPhoto"),
  createDriverProfileValidation,
  validateRequest,
  driverController.updateDriverProfile.bind(driverController),
);

router.get(
  "/all",
  requireAuth,
  driverController.getAllDrivers.bind(driverController),
);

router.patch(
  "/active",
  requireAuth,
  requireUserType(["DRIVER"]),
  [body("active").isBoolean().withMessage("active must be true or false")],
  validateRequest,
  driverController.updateActiveStatus.bind(driverController),
);

// Error handling middleware for multer
router.use(
  (
    _error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
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
  },
);

export default router;
