// Mock Package Service for development
import { PackageStatus, PackageSize } from "@shared/types";

export interface PackageFilters {
  status?: PackageStatus;
  minPrice?: number;
  maxPrice?: number;
  size?: PackageSize;
  customerId?: string;
  search?: string;
  weight?: number;
  minWeight?: number;
  maxWeight?: number;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "createdAt" | "priceOffered" | "weight" | "status";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export class MockPackageService {
  async createPackage(packageData: any) {
    try {
      // Mock package creation
      const mockPackage = {
        id: `pkg_${Date.now()}`,
        ...packageData,
        status: "PENDING",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log(`Mock: Created package ${mockPackage.id}`);
      return mockPackage;
    } catch (error) {
      console.error("Mock package creation error:", error);
      throw new Error("Failed to create package");
    }
  }

  async getPackages(filters: PackageFilters) {
    try {
      // Mock packages data
      const mockPackages = [
        {
          id: "pkg_1",
          customerId: "customer_1",
          description: "Mock package 1",
          pickupAddress: "123 Main St, Gaborone",
          pickupLat: -24.6541,
          pickupLng: 25.9087,
          deliveryAddress: "456 Airport Rd, Gaborone",
          deliveryLat: -24.6541,
          deliveryLng: 25.9087,
          priceOffered: 150,
          status: "PENDING",
          size: "MEDIUM",
          weight: 2.5,
          deliveryDate: new Date(Date.now() + 86400000).toISOString(),
          urgency: "NORMAL",
          recipientPhone: "71234567",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "pkg_2",
          customerId: "customer_2",
          description: "Mock package 2",
          pickupAddress: "789 Broad St, Francistown",
          pickupLat: -21.1702,
          pickupLng: 27.4916,
          deliveryAddress: "321 Mall St, Francistown",
          deliveryLat: -21.1702,
          deliveryLng: 27.4916,
          priceOffered: 200,
          status: "ACCEPTED",
          size: "LARGE",
          weight: 5.0,
          deliveryDate: new Date(Date.now() + 172800000).toISOString(),
          urgency: "URGENT",
          recipientPhone: "72345678",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      // Apply filters (mock implementation)
      let filteredPackages = mockPackages;

      if (filters.status) {
        filteredPackages = filteredPackages.filter(
          (pkg) => pkg.status === filters.status,
        );
      }

      if (filters.minPrice) {
        filteredPackages = filteredPackages.filter(
          (pkg) => pkg.priceOffered >= filters.minPrice!,
        );
      }

      if (filters.maxPrice) {
        filteredPackages = filteredPackages.filter(
          (pkg) => pkg.priceOffered <= filters.maxPrice!,
        );
      }

      if (filters.customerId) {
        filteredPackages = filteredPackages.filter(
          (pkg) => pkg.customerId === filters.customerId,
        );
      }

      // Apply pagination
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      const paginatedPackages = filteredPackages.slice(offset, offset + limit);

      console.log(`Mock: Retrieved ${paginatedPackages.length} packages`);
      return {
        packages: paginatedPackages,
        total: filteredPackages.length,
        limit,
        offset,
        data: {
          packages: paginatedPackages,
          total: filteredPackages.length,
          limit,
          offset,
        },
      };
    } catch (error) {
      console.error("Mock get packages error:", error);
      throw new Error("Failed to get packages");
    }
  }

  async getPackageById(id: string) {
    try {
      // Mock package by ID
      const mockPackage = {
        id,
        customerId: "customer_1",
        description: "Mock package details",
        pickupAddress: "123 Main St, Gaborone",
        pickupLat: -24.6541,
        pickupLng: 25.9087,
        deliveryAddress: "456 Airport Rd, Gaborone",
        deliveryLat: -24.6541,
        deliveryLng: 25.9087,
        priceOffered: 150,
        status: "PENDING",
        size: "MEDIUM",
        weight: 2.5,
        deliveryDate: new Date(Date.now() + 86400000).toISOString(),
        urgency: "NORMAL",
        recipientPhone: "71234567",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log(`Mock: Retrieved package ${id}`);
      return mockPackage;
    } catch (error) {
      console.error("Mock get package by ID error:", error);
      throw new Error("Failed to get package");
    }
  }

  async updatePackageStatus(id: string, status: string, notes?: string) {
    try {
      console.log(`Mock: Updated package ${id} status to ${status}`);
      const payload = {
        id,
        status,
        notes,
        updatedAt: new Date().toISOString(),
      };
      return { data: payload, ...payload } as any;
    } catch (error) {
      console.error("Mock update package status error:", error);
      throw new Error("Failed to update package status");
    }
  }

  async updatePackage(id: string, updateData: any, _userId?: string) {
    try {
      const updated = {
        id,
        ...updateData,
        updatedAt: new Date().toISOString(),
      };
      console.log(`Mock: Updated package ${id}`);
      return updated;
    } catch (error) {
      console.error("Mock update package error:", error);
      throw new Error("Failed to update package");
    }
  }

  async deletePackage(id: string) {
    try {
      console.log(`Mock: Deleted package ${id}`);
      return { success: true, message: "Package deleted successfully" };
    } catch (error) {
      console.error("Mock delete package error:", error);
      throw new Error("Failed to delete package");
    }
  }

  async uploadPackageImage(packageId: string, _file: any, _userId: string) {
    try {
      const mockUrl = `https://mock-s3-bucket.com/packages/${packageId}/image-${Date.now()}.jpg`;
      console.log(`Mock: Uploaded image for package ${packageId}`);
      return { url: mockUrl };
    } catch (error) {
      console.error("Mock upload package image error:", error);
      throw new Error("Failed to upload package image");
    }
  }

  async getPackageImage(key: string) {
    try {
      const mockUrl = `https://mock-s3-bucket.com/${key}`;
      console.log(`Mock: Retrieved package image ${key}`);
      return { url: mockUrl };
    } catch (error) {
      console.error("Mock get package image error:", error);
      throw new Error("Failed to get package image");
    }
  }

  async searchPackagesByLocation(
    lat: number,
    lng: number,
    radius: number,
    _filters: PackageFilters,
  ) {
    console.log(
      `Mock: Search packages near (${lat}, ${lng}) within ${radius}km`,
    );
    const mock = await this.getPackages({ limit: 20, offset: 0 });
    return { data: mock.packages };
  }
}

export default new MockPackageService();
