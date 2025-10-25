import { Request, Response } from 'express';
import packageService from '../services/packageService';
import s3UploadService from '../services/s3UploadService';
import { AppError } from '../utils/AppError';
import { validationResult } from 'express-validator';
import { PackageFilters } from '../services/packageService';

export class PackageController {
  async createPackage(req: Request, res: Response) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const userId = (req as any).user.id;
      const packageData: any = {
        customerId: userId,
        description: req.body.description,
        pickupAddress: req.body.pickupAddress,
        pickupLat: parseFloat(req.body.pickupLat),
        pickupLng: parseFloat(req.body.pickupLng),
        deliveryAddress: req.body.deliveryAddress,
        deliveryLat: parseFloat(req.body.deliveryLat),
        deliveryLng: parseFloat(req.body.deliveryLng),
        priceOffered: parseFloat(req.body.priceOffered),
        size: req.body.size,
        weight: req.body.weight ? parseFloat(req.body.weight) : undefined
      };

      // Handle image upload if present
      if (req.file) {
        const uploadResult = await s3UploadService.uploadPackageImage(
          req.file,
          userId
        );
        packageData.imageUrl = uploadResult.url;
      }

      const result = await packageService.createPackage(packageData);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Package created successfully'
      });
    } catch (_error: any) {
      console.error('Error creating package:', _error);
      
      if (_error instanceof AppError) {
        return res.status(_error.statusCode).json({
          success: false,
          error: {
            code: _error.code,
            message: _error.message
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create package'
        }
      });
    }
  }

  async getPackages(req: Request, res: Response) {
    try {
      const filters: any = {
        status: req.query.status as string,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        size: req.query.size as string,
        customerId: req.query.customerId as string,
        search: req.query.search as string,
        weight: req.query.weight ? parseFloat(req.query.weight as string) : undefined,
        minWeight: req.query.minWeight ? parseFloat(req.query.minWeight as string) : undefined,
        maxWeight: req.query.maxWeight ? parseFloat(req.query.maxWeight as string) : undefined,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: req.query.sortOrder as string || 'desc',
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] === undefined) {
          delete filters[key as keyof typeof filters];
        }
      });

      const result = await packageService.getPackages(filters);

      res.json({
        success: true,
        data: result
      });
    } catch (_error: any) {
      console.error('Error fetching packages:', _error);
      
      if (_error instanceof AppError) {
        return res.status(_error.statusCode).json({
          success: false,
          error: {
            code: _error.code,
            message: _error.message
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch packages'
        }
      });
    }
  }

  async getPackageById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await packageService.getPackageById(id);

      res.json({
        success: true,
        data: result
      });
    } catch (_error: any) {
      console.error('Error fetching package:', _error);
      
      if (_error instanceof AppError) {
        return res.status(_error.statusCode).json({
          success: false,
          error: {
            code: _error.code,
            message: _error.message
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch package'
        }
      });
    }
  }

  async updatePackage(req: Request, res: Response) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const { id } = req.params;
      const userId = (req as any).user?.id;
      const updateData = req.body;

      const result = await packageService.updatePackage(id, updateData, userId);

      res.json({
        success: true,
        data: result,
        message: 'Package updated successfully'
      });
    } catch (_error: any) {
      console.error('Error updating package:', _error);
      
      if (_error instanceof AppError) {
        return res.status(_error.statusCode).json({
          success: false,
          error: {
            code: _error.code,
            message: _error.message
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    }
  }

  async updatePackageStatus(req: Request, res: Response) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
      }

      const { id } = req.params;
      const authenticatedUser = (req as any).user;
      const updateData = {
        status: req.body.status,
        notes: req.body.notes
      };

      // First, get the package to check ownership
      const package_ = await packageService.getPackageById(id);
      if (!package_) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PACKAGE_NOT_FOUND',
            message: 'Package not found'
          }
        });
      }

      // Access control: Only the package owner or admin can update status
      if (authenticatedUser.role !== 'ADMIN' && package_.data.customerId !== authenticatedUser.id) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied. You can only update your own packages.'
          }
        });
      }

      const result = await packageService.updatePackageStatus(id, updateData);

      res.json({
        success: true,
        data: result.data,
        message: 'Package status updated successfully'
      });
    } catch (_error: any) {
      console.error('Error fetching package:', _error);
      
      if (_error instanceof AppError) {
        return res.status(_error.statusCode).json({
          success: false,
          error: {
            code: _error.code,
            message: _error.message
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update package status'
        }
      });
    }
  }

  async deletePackage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const result = await packageService.deletePackage(id, userId);

      res.json({
        success: true,
        message: result?.message || 'Package deleted successfully'
      });
    } catch (_error: any) {
      console.error('Error fetching package:', _error);
      
      if (_error instanceof AppError) {
        return res.status(_error.statusCode).json({
          success: false,
          error: {
            code: _error.code,
            message: _error.message
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete package'
        }
      });
    }
  }

  async uploadPackageImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No image file provided'
          }
        });
      }

      const userId = (req as any).user.id;
      const packageId = req.params.id;

      const uploadResult = await s3UploadService.uploadPackageImage(
        req.file,
        userId,
        packageId
      );

      res.json({
        success: true,
        data: {
          imageUrl: uploadResult.url,
          key: uploadResult.key
        },
        message: 'Image uploaded successfully'
      });
    } catch (_error: any) {
      console.error('Error fetching package:', _error);
      
      if (_error instanceof AppError) {
        return res.status(_error.statusCode).json({
          success: false,
          error: {
            code: _error.code,
            message: _error.message
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to upload image'
        }
      });
    }
  }

  async getPackageImage(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const expiresIn = parseInt(req.query.expires as string) || 3600;

      const signedUrl = await s3UploadService.getSignedUrl(key, expiresIn);

      res.json({
        success: true,
        data: {
          signedUrl,
          expiresIn
        }
      });
    } catch (_error: any) {
      console.error('Error fetching package:', _error);
      
      if (_error instanceof AppError) {
        return res.status(_error.statusCode).json({
          success: false,
          error: {
            code: _error.code,
            message: _error.message
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate signed URL'
        }
      });
    }
  }

  async searchPackages(req: Request, res: Response) {
    try {
      const { q, location, radius, minPrice, maxPrice, size, weight, minWeight, maxWeight, dateFrom, dateTo, sortBy, sortOrder } = req.query;

      // Build search filters
      const filters: any = {};

      if (q) {
        filters.search = q as string;
      }

      if (minPrice) {
        filters.minPrice = parseFloat(minPrice as string);
      }

      if (maxPrice) {
        filters.maxPrice = parseFloat(maxPrice as string);
      }

      if (size) {
        filters.size = size as string;
      }

      if (weight) {
        filters.weight = parseFloat(weight as string);
      }

      if (minWeight) {
        filters.minWeight = parseFloat(minWeight as string);
      }

      if (maxWeight) {
        filters.maxWeight = parseFloat(maxWeight as string);
      }

      if (dateFrom) {
        filters.dateFrom = dateFrom as string;
      }

      if (dateTo) {
        filters.dateTo = dateTo as string;
      }

      if (sortBy) {
        filters.sortBy = sortBy as string;
      }

      if (sortOrder) {
        filters.sortOrder = sortOrder as string;
      }

      // Add pagination
      filters.limit = parseInt(req.query.limit as string) || 20;
      filters.offset = parseInt(req.query.offset as string) || 0;

      const result = await packageService.getPackages(filters);

      res.json({
        success: true,
        data: result.data,
        searchParams: {
          query: q,
          location,
          radius,
          minPrice,
          maxPrice,
          size
        }
      });
    } catch (_error: any) {
      console.error('Error fetching package:', _error);
      
      if (_error instanceof AppError) {
        return res.status(_error.statusCode).json({
          success: false,
          error: {
            code: _error.code,
            message: _error.message
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search packages'
        }
      });
    }
  }

  async searchPackagesByLocation(req: Request, res: Response) {
    try {
      const { lat, lng, radius } = req.query;
      const filters: any = {
        status: req.query.status as string,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        size: req.query.size as string,
        weight: req.query.weight ? parseFloat(req.query.weight as string) : undefined,
        minWeight: req.query.minWeight ? parseFloat(req.query.minWeight as string) : undefined,
        maxWeight: req.query.maxWeight ? parseFloat(req.query.maxWeight as string) : undefined,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: req.query.sortOrder as string || 'desc',
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] === undefined) {
          delete filters[key as keyof typeof filters];
        }
      });

      const result = await packageService.searchPackagesByLocation(
        parseFloat(lat as string),
        parseFloat(lng as string),
        radius ? parseFloat(radius as string) : 10,
        filters
      );

      res.json({
        success: true,
        data: result.data
      });
    } catch (_error: any) {
      console.error('Error fetching package:', _error);
      
      if (_error instanceof AppError) {
        return res.status(_error.statusCode).json({
          success: false,
          error: {
            code: _error.code,
            message: _error.message
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search packages by location'
        }
      });
    }
  }

  async getPackagesByUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { status, limit: _limit = 20, offset: _offset = 0 } = req.query;
      const authenticatedUser = (req as any).user;

      // Access control: Users can only access their own packages, unless they're admin
      if (authenticatedUser.role !== 'ADMIN' && authenticatedUser.id !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied. You can only access your own packages.'
          }
        });
      }

      const filters: PackageFilters = {
        status: status as any
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] === undefined) {
          delete filters[key as keyof typeof filters];
        }
      });

      const result = await packageService.getPackages(filters);

      res.json({
        success: true,
        data: result.data
      });
    } catch (_error: any) {
      console.error('Error fetching package:', _error);
      
      if (_error instanceof AppError) {
        return res.status(_error.statusCode).json({
          success: false,
          error: {
            code: _error.code,
            message: _error.message
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get packages by user'
        }
      });
    }
  }
}

export default new PackageController();
