import { Router } from "express";
import multer from "multer";
import { UserController } from "../controllers/userController";
import { requireAuth } from "../middleware/auth";

const router = Router();
const userController = new UserController();

// Configure multer for profile picture upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for profile pictures
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

// Profile picture routes
router.post(
  "/profile/picture",
  requireAuth,
  upload.single("profilePicture"),
  userController.uploadProfilePicture.bind(userController),
);

router.delete(
  "/profile/picture",
  requireAuth,
  userController.deleteProfilePicture.bind(userController),
);

// Get user profile
router.get(
  "/profile",
  requireAuth,
  userController.getProfile.bind(userController),
);

export default router;
