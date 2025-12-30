// Simple Express server for testing mobile app integration
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// Mock authentication endpoints
app.post('/api/auth/login-phone', (req, res) => {
  const { phone, password } = req.body;
  
  if (!phone || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_CREDENTIALS', message: 'Phone and password are required' }
    });
  }

  // Mock successful login
  res.json({
    success: true,
    data: {
      user: {
        id: 'user_123',
        phone,
        userType: 'CUSTOMER',
        firstName: 'Mock',
        lastName: 'User'
      },
      token: 'mock-jwt-token-123'
    },
    message: 'Login successful'
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, firstName, lastName, phone, userType } = req.body;
  
  if (!email || !password || !firstName || !lastName || !phone || !userType) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_FIELDS', message: 'All fields are required' }
    });
  }

  // Mock successful registration
  res.status(201).json({
    success: true,
    data: {
      id: 'user_' + Date.now(),
      email,
      firstName,
      lastName,
      phone,
      userType
    },
    message: 'Registration successful'
  });
});

// Mock package endpoints
app.post('/api/packages', (req, res) => {
  const packageData = req.body;
  
  // Mock package creation
  const mockPackage = {
    id: 'pkg_' + Date.now(),
    ...packageData,
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  res.status(201).json({
    success: true,
    data: mockPackage,
    message: 'Package created successfully'
  });
});

app.get('/api/packages', (req, res) => {
  // Mock packages list
  const mockPackages = [
    {
      id: 'pkg_1',
      description: 'Mock package 1',
      pickupAddress: '123 Main St, Gaborone',
      deliveryAddress: '456 Airport Rd, Gaborone',
      priceOffered: 150,
      status: 'PENDING',
      urgency: 'NORMAL'
    },
    {
      id: 'pkg_2',
      description: 'Mock package 2',
      pickupAddress: '789 Broad St, Francistown',
      deliveryAddress: '321 Mall St, Francistown',
      priceOffered: 200,
      status: 'ACCEPTED',
      urgency: 'URGENT'
    }
  ];

  res.json({
    success: true,
    data: mockPackages
  });
});

// Mock bid endpoints
app.post('/api/bids', (req, res) => {
  const { packageId, amount, message } = req.body;
  
  const mockBid = {
    id: 'bid_' + Date.now(),
    packageId,
    amount: parseFloat(amount),
    message: message || 'Mock bid',
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  res.status(201).json({
    success: true,
    data: mockBid,
    message: 'Bid created successfully'
  });
});

app.get('/api/bids/package/:packageId', (req, res) => {
  const { packageId } = req.params;
  
  const mockBids = [
    {
      id: 'bid_1',
      packageId,
      amount: 120,
      message: 'I can deliver this quickly',
      status: 'PENDING',
      driver: {
        firstName: 'John',
        lastName: 'Driver',
        rating: 4.5
      }
    }
  ];

  res.json({
    success: true,
    data: mockBids
  });
});

app.post('/api/bids/:id/counter', (req, res) => {
  const { id } = req.params;
  const { amount, message } = req.body;
  
  res.json({
    success: true,
    data: {
      id: 'counter_' + Date.now(),
      originalBidId: id,
      amount: parseFloat(amount),
      message: message || 'Counter offer'
    },
    message: 'Counter bid created successfully'
  });
});

// Mock driver endpoints
app.post('/api/driver/profile', (req, res) => {
  const { carRegistration, carDescription } = req.body;
  
  const mockProfile = {
    id: 'driver_' + Date.now(),
    carRegistration,
    carDescription,
    rating: 0,
    totalDeliveries: 0,
    active: true
  };

  res.status(201).json({
    success: true,
    data: mockProfile,
    message: 'Driver profile created successfully'
  });
});

app.get('/api/driver/all', (req, res) => {
  const mockDrivers = [
    {
      id: 'driver_1',
      firstName: 'John',
      lastName: 'Driver',
      rating: 4.5,
      totalDeliveries: 25,
      carRegistration: 'B123 ABC'
    },
    {
      id: 'driver_2',
      firstName: 'Jane',
      lastName: 'Driver',
      rating: 4.8,
      totalDeliveries: 42,
      carRegistration: 'B456 DEF'
    }
  ];

  res.json({
    success: true,
    data: mockDrivers
  });
});

// Mock verification endpoints
app.post('/api/verification/submit', (req, res) => {
  res.status(201).json({
    success: true,
    data: {
      id: 'verification_' + Date.now(),
      status: 'PENDING'
    },
    message: 'Verification submitted successfully'
  });
});

app.get('/api/verification/my-status', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 'verification_123',
      status: 'PENDING',
      documentType: 'DRIVERS_LICENSE'
    }
  });
});

// Mock notification endpoints
app.get('/api/notifications', (req, res) => {
  const mockNotifications = [
    {
      id: 'notif_1',
      title: 'New Bid Received',
      message: 'You have received a new bid for your package',
      isRead: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'notif_2',
      title: 'Package Delivered',
      message: 'Your package has been successfully delivered',
      isRead: true,
      createdAt: new Date(Date.now() - 3600000).toISOString()
    }
  ];

  res.json({
    success: true,
    data: mockNotifications
  });
});

app.get('/api/notifications/unread-count', (req, res) => {
  res.json({
    success: true,
    data: { unreadCount: 1 }
  });
});

app.put('/api/notifications/:id/read', (req, res) => {
  res.json({
    success: true,
    message: 'Notification marked as read'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock API server running on port ${PORT}`);
  console.log(`📱 Mobile app should connect to: http://192.168.1.116:${PORT}`);
  console.log(`🔗 Health check: http://192.168.1.116:${PORT}/health`);
});

module.exports = app;
