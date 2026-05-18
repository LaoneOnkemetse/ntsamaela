// Legacy development-only routes.
// Production does not mount this router (see app.ts).
// All features should use real route modules under /api/*.

import { Router, Request, Response } from "express";

const router = Router();

router.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: "LEGACY_ROUTE_DISABLED",
      message: `Legacy mock route ${req.method} ${req.path} is disabled. Use the real API modules instead.`,
    },
  });
});

export default router;
