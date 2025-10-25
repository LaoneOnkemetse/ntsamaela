import { Response } from 'express';
import { getRealtimeService } from '../services/realtimeService';
import { 
  PackageTracking, 
  // CreateTrackingUpdateRequest,
  // TrackingFilters,
  ApiResponse,
  // PaginatedResponse,
  AuthenticatedRequest
} from '@ntsamaela/shared/types';
import { AppError } from '../utils/errors';

export class TrackingController {
  private get realtimeService() {
    return getRealtimeService();
  }

  createTrackingUpdate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { packageId, status, location, latitude, longitude, notes } = req.body;

      if (!packageId || !status) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Package ID and status are required'
          }
        });
        return;
      }

      const tracking = await this.realtimeService.createTrackingUpdate(
        packageId,
        status,
        location,
        latitude,
        longitude,
        notes
      );

      const response: ApiResponse<PackageTracking> = {
        success: true,
        data: tracking,
        message: 'Tracking update created successfully'
      };

      res.status(201).json(response);
    } catch (_error) {
      if (_error instanceof AppError) {
        res.status(_error.statusCode).json({
          success: false,
          error: {
            code: _error.code,
            message: _error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'TRACKING_UPDATE_FAILED',
            message: 'Failed to create tracking update'
          }
        });
      }
    }
  }

  getPackageTracking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { packageId } = req.params;

      if (!packageId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PACKAGE_ID',
            message: 'Package ID is required'
          }
        });
        return;
      }

      const tracking = await this.realtimeService.getPackageTracking(packageId);

      const response: ApiResponse<PackageTracking[]> = {
        success: true,
        data: tracking,
        message: 'Package tracking retrieved successfully'
      };

      res.status(200).json(response);
    } catch (_error) {
      if (_error instanceof AppError) {
        res.status(_error.statusCode).json({
          success: false,
          error: {
            code: _error.code,
            message: _error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'TRACKING_FETCH_FAILED',
            message: 'Failed to fetch package tracking'
          }
        });
      }
    }
  }

  updatePackageLocation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { packageId } = req.params;
      const { latitude, longitude, location } = req.body;

      if (!packageId || !latitude || !longitude) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Package ID, latitude, and longitude are required'
          }
        });
        return;
      }

      // Create a location update tracking entry
      const tracking = await this.realtimeService.createTrackingUpdate(
        packageId,
        'LOCATION_UPDATE',
        location,
        latitude,
        longitude,
        'Location updated'
      );

      // Emit real-time location update
      this.realtimeService.emitToRoom(`package:${packageId}`, 'package:location:update', {
        packageId,
        latitude,
        longitude,
        location
      });

      const response: ApiResponse<PackageTracking> = {
        success: true,
        data: tracking,
        message: 'Package location updated successfully'
      };

      res.status(200).json(response);
    } catch (_error) {
      if (_error instanceof AppError) {
        res.status(_error.statusCode).json({
          success: false,
          error: {
            code: _error.code,
            message: _error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'LOCATION_UPDATE_FAILED',
            message: 'Failed to update package location'
          }
        });
      }
    }
  }

  startDelivery = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { packageId } = req.params;
      const driverId = req.user!.id;

      if (!packageId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PACKAGE_ID',
            message: 'Package ID is required'
          }
        });
        return;
      }

      // Create tracking update
      const tracking = await this.realtimeService.createTrackingUpdate(
        packageId,
        'IN_TRANSIT',
        'Delivery started',
        undefined,
        undefined,
        'Driver has started the delivery'
      );

      // Notify delivery started
      await this.realtimeService.notifyDeliveryStarted(packageId, driverId);

      const response: ApiResponse<PackageTracking> = {
        success: true,
        data: tracking,
        message: 'Delivery started successfully'
      };

      res.status(200).json(response);
    } catch (_error) {
      if (_error instanceof AppError) {
        res.status(_error.statusCode).json({
          success: false,
          error: {
            code: _error.code,
            message: _error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'DELIVERY_START_FAILED',
            message: 'Failed to start delivery'
          }
        });
      }
    }
  }

  completeDelivery = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { packageId } = req.params;
      const driverId = req.user!.id;

      if (!packageId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PACKAGE_ID',
            message: 'Package ID is required'
          }
        });
        return;
      }

      // Create tracking update
      const tracking = await this.realtimeService.createTrackingUpdate(
        packageId,
        'DELIVERED',
        'Package delivered',
        undefined,
        undefined,
        'Package has been successfully delivered'
      );

      // Notify delivery completed
      await this.realtimeService.notifyDeliveryCompleted(packageId, driverId);

      const response: ApiResponse<PackageTracking> = {
        success: true,
        data: tracking,
        message: 'Delivery completed successfully'
      };

      res.status(200).json(response);
    } catch (_error) {
      if (_error instanceof AppError) {
        res.status(_error.statusCode).json({
          success: false,
          error: {
            code: _error.code,
            message: _error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'DELIVERY_COMPLETE_FAILED',
            message: 'Failed to complete delivery'
          }
        });
      }
    }
  }
}

export default new TrackingController();
