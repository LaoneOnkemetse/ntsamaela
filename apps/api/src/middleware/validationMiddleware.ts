import { Request, Response, NextFunction } from 'express';

interface ValidationRule {
  type: string;
  required?: boolean;
  enum?: string[];
  min?: number;
  max?: number;
  pattern?: string;
}

interface ValidationSchema {
  body?: Record<string, ValidationRule>;
  query?: Record<string, ValidationRule>;
  params?: Record<string, ValidationRule>;
}

export const validateRequest = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    // Validate body
    if (schema.body) {
      for (const [field, rule] of Object.entries(schema.body)) {
        const value = req.body[field];

        if (rule.required && (value === undefined || value === null || value === '')) {
          errors.push(`${field} is required`);
          continue;
        }

        if (value !== undefined && value !== null && value !== '') {
          if (rule.type && typeof value !== rule.type) {
            errors.push(`${field} must be of type ${rule.type}`);
          }

          if (rule.enum && !rule.enum.includes(value)) {
            errors.push(`${field} must be one of: ${rule.enum.join(', ')}`);
          }

          if (rule.min !== undefined && value < rule.min) {
            errors.push(`${field} must be at least ${rule.min}`);
          }

          if (rule.max !== undefined && value > rule.max) {
            errors.push(`${field} must be at most ${rule.max}`);
          }

          if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
            errors.push(`${field} format is invalid`);
          }
        }
      }
    }

    // Validate query parameters
    if (schema.query) {
      for (const [field, rule] of Object.entries(schema.query)) {
        const value = req.query[field];

        if (rule.required && (value === undefined || value === null || value === '')) {
          errors.push(`${field} query parameter is required`);
          continue;
        }

        if (value !== undefined && value !== null && value !== '') {
          // Parse query parameters based on expected type
          let parsedValue: any = value;
          if (rule.type === 'number') {
            parsedValue = Number(value);
            if (isNaN(parsedValue)) {
              errors.push(`${field} query parameter must be a valid number`);
              continue;
            }
            // Update the request object with the parsed value
            req.query[field] = parsedValue;
          }

          if (rule.type && typeof parsedValue !== rule.type) {
            errors.push(`${field} query parameter must be of type ${rule.type}`);
          }

          if (rule.enum && !rule.enum.includes(parsedValue as string)) {
            errors.push(`${field} query parameter must be one of: ${rule.enum.join(', ')}`);
          }

          if (rule.min !== undefined && parsedValue < rule.min) {
            errors.push(`${field} query parameter must be at least ${rule.min}`);
          }

          if (rule.max !== undefined && parsedValue > rule.max) {
            errors.push(`${field} query parameter must be at most ${rule.max}`);
          }
        }
      }
    }

    // Validate path parameters
    if (schema.params) {
      for (const [field, rule] of Object.entries(schema.params)) {
        const value = req.params[field];

        if (rule.required && (value === undefined || value === null || value === '')) {
          errors.push(`${field} path parameter is required`);
          continue;
        }

        if (value !== undefined && value !== null && value !== '') {
          if (rule.type && typeof value !== rule.type) {
            errors.push(`${field} path parameter must be of type ${rule.type}`);
          }

          if (rule.enum && !rule.enum.includes(value)) {
            errors.push(`${field} path parameter must be one of: ${rule.enum.join(', ')}`);
          }
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors,
        },
      });
    }

    next();
  };
};
