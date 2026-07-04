import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors
      .array()
      .map((e: any) => e.msg || `Invalid value for ${e.path || e.param}`);
    const uniqueMessages = [...new Set(errorMessages)];
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message:
          uniqueMessages.length === 1
            ? uniqueMessages[0]
            : `Please fix the following: ${uniqueMessages.join("; ")}`,
        details: uniqueMessages,
      },
    });
  }

  next();
};
