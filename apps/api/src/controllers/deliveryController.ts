import { Response } from 'express';
import { getPrismaClient } from '@database/index';
import { AuthenticatedRequest } from '@shared/types';

export class DeliveryController {
  private getPrisma() {
    return getPrismaClient();
  }

  async updateDeliveryStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { packageId } = req.params;
      const { status } = req.body;
      const userId = req.user!.id;
      const prisma = this.getPrisma();

      const package1 = await prisma.package.findUnique({
        where: { id: packageId },
        include: { bids: true }
      });

      if (!package1) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PACKAGE_NOT_FOUND',
            message: 'Package not found'
          }
        });
      }

      // Check if user is authorized to update this package
      const acceptedBid = package1.bids.find((bid: any) => bid.status === 'ACCEPTED');
      if (!acceptedBid || acceptedBid.driverId !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authorized to update this package'
          }
        });
      }

      const updatedPackage = await prisma.package.update({
        where: { id: packageId },
        data: { status }
      });

      res.status(200).json({
        success: true,
        data: updatedPackage
      });
    } catch (_error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'DELIVERY_UPDATE_ERROR',
          message: 'Failed to update delivery status'
        }
      });
    }
  }

  async createTrackingUpdate(req: AuthenticatedRequest, res: Response) {
    try {
      const { packageId } = req.params;
      const { status, location, latitude, longitude, notes } = req.body;
      const prisma = this.getPrisma();

      // Validate required fields
      if (!status) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Status is required'
          }
        });
      }

      const trackingUpdate = await prisma.packageTracking.create({
        data: {
          packageId,
          status,
          location,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          notes
        }
      });

      res.status(201).json({
        success: true,
        data: trackingUpdate
      });
    } catch (_error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'TRACKING_UPDATE_ERROR',
          message: 'Failed to create tracking update'
        }
      });
    }
  }

  async getPackageTracking(req: AuthenticatedRequest, res: Response) {
    try {
      const { packageId } = req.params;
      const prisma = this.getPrisma();

      const trackingUpdates = await prisma.packageTracking.findMany({
        where: { packageId },
        orderBy: { timestamp: 'desc' }
      });

      res.status(200).json({
        success: true,
        data: trackingUpdates
      });
    } catch (_error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'TRACKING_RETRIEVAL_ERROR',
          message: 'Failed to retrieve package tracking'
        }
      });
    }
  }

  async getDeliveries(req: AuthenticatedRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const prisma = this.getPrisma();

      const where: any = {};
      if (status) {
        where.status = status;
      }

      const [deliveries, total] = await Promise.all([
        prisma.delivery.findMany({
          where,
          include: {
            package: {
              include: {
                customer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true
                  }
                }
              }
            },
            driver: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true
                  }
                }
              }
            }
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.delivery.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          deliveries,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (_error) {
      console.error('Error getting deliveries:', _error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getDelivery(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const prisma = this.getPrisma();

      const delivery = await prisma.delivery.findUnique({
        where: { id },
        include: {
          package: {
            include: {
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          trackingUpdates: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!delivery) {
        res.status(404).json({ success: false, message: 'Delivery not found' });
        return;
      }

      res.json({
        success: true,
        data: delivery
      });
    } catch (_error) {
      console.error('Error getting delivery:', _error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getDeliveryTracking(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const prisma = this.getPrisma();

      const trackingUpdates = await prisma.packageTracking.findMany({
        where: { packageId: id },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: trackingUpdates
      });
    } catch (_error) {
      console.error('Error getting delivery tracking:', _error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getMyDeliveries(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const prisma = this.getPrisma();

      const where: any = {
        bids: {
          some: {
            driverId: userId,
            status: 'ACCEPTED'
          }
        }
      };

      if (status) {
        where.status = status;
      }

      const packages = await prisma.package.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          bids: {
            where: {
              driverId: userId,
              status: 'ACCEPTED'
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      res.status(200).json({
        success: true,
        data: { packages }
      });
    } catch (_error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'DELIVERIES_RETRIEVAL_ERROR',
          message: 'Failed to retrieve deliveries'
        }
      });
    }
  }
}
