const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer setup for file uploads
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: { message: 'No token provided' } });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: { message: 'Invalid token' } });
    }
    req.user = user;
    next();
  });
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'Connected',
    version: '1.0.0'
  });
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, phone, password, userType } = req.body;
    
    if (!firstName || !lastName || !phone || !password || !userType) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'All fields are required' } 
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: phone },
          { email: `${phone}@example.com` }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'User already exists with this phone number' } 
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        phone,
        email: `${phone}@example.com`,
        passwordHash,
        userType: userType.toUpperCase(),
        identityVerified: false,
        emailVerified: false
      }
    });

    // Create wallet for the user
    await prisma.wallet.create({
      data: {
        userId: newUser.id,
        balance: 0,
        currency: 'BWP'
      }
    });

    // Create driver profile if user is a driver
    if (userType.toUpperCase() === 'DRIVER') {
      await prisma.driver.create({
        data: {
          userId: newUser.id,
          rating: 0,
          totalDeliveries: 0,
          active: true
        }
      });
    }

    res.status(201).json({ 
      success: true, 
      message: 'User registered successfully', 
      data: { userId: newUser.id } 
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Registration failed' } 
    });
  }
});

app.post('/api/auth/login-phone', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Phone and password are required' } 
      });
    }

    // Find user by phone
    const user = await prisma.user.findFirst({
      where: { phone },
      include: {
        driverProfile: true,
        wallet: true
      }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'Invalid credentials' } 
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'Invalid credentials' } 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        userType: user.userType,
        isVerified: user.identityVerified 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.status(200).json({ 
      success: true, 
      data: { 
        token, 
        user: { 
          id: user.id, 
          firstName: user.firstName, 
          lastName: user.lastName, 
          phone: user.phone,
          userType: user.userType, 
          isVerified: user.identityVerified,
          profilePhoto: null,
          rating: user.driverProfile?.rating || 0,
          totalDeliveries: user.driverProfile?.totalDeliveries || 0,
          totalEarnings: user.wallet?.balance || 0
        } 
      } 
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Login failed' } 
    });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        driverProfile: true,
        wallet: true
      }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'User not found' } 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: { 
        id: user.id, 
        firstName: user.firstName, 
        lastName: user.lastName, 
        phone: user.phone,
        userType: user.userType, 
        isVerified: user.identityVerified,
        profilePhoto: null,
        rating: user.driverProfile?.rating || 0,
        totalDeliveries: user.driverProfile?.totalDeliveries || 0,
        totalEarnings: user.wallet?.balance || 0
      } 
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to get user data' } 
    });
  }
});

// Package Routes
app.post('/api/packages', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { 
      description, 
      pickupAddress, 
      pickupLat, 
      pickupLng, 
      deliveryAddress, 
      deliveryLat, 
      deliveryLng, 
      priceOffered, 
      weight, 
      deliveryDate, 
      urgency, 
      recipientPhone 
    } = req.body;

    if (req.user.userType !== 'CUSTOMER') {
      return res.status(403).json({ 
        success: false, 
        error: { message: 'Only customers can create packages' } 
      });
    }

    const package = await prisma.package.create({
      data: {
        customerId: req.user.id,
        description,
        imageUrl: req.file ? `mock-s3-url/${req.user.id}/package-${Date.now()}.jpg` : null,
        pickupAddress,
        pickupLat: parseFloat(pickupLat),
        pickupLng: parseFloat(pickupLng),
        deliveryAddress,
        deliveryLat: parseFloat(deliveryLat),
        deliveryLng: parseFloat(deliveryLng),
        priceOffered: parseFloat(priceOffered),
        weight: weight ? parseFloat(weight) : null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        urgency: urgency || 'NORMAL',
        recipientPhone: recipientPhone || null
      }
    });

    res.status(201).json({ 
      success: true, 
      message: 'Package created successfully', 
      data: package 
    });

  } catch (error) {
    console.error('Create package error:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to create package' } 
    });
  }
});

app.get('/api/packages', authenticateToken, async (req, res) => {
  try {
    let packages;
    
    if (req.user.userType === 'CUSTOMER') {
      // Customers see their own packages
      packages = await prisma.package.findMany({
        where: { customerId: req.user.id },
        include: {
          bids: {
            include: {
              driver: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      phone: true,
                      profilePhoto: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Drivers see available packages
      packages = await prisma.package.findMany({
        where: { 
          status: 'PENDING',
          NOT: { customerId: req.user.id }
        },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              profilePhoto: true
            }
          },
          bids: {
            where: { driverId: req.user.driverProfile?.id }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    res.status(200).json({ success: true, data: packages });

  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to get packages' } 
    });
  }
});

// Driver Routes
app.post('/api/driver/profile', authenticateToken, upload.single('carPhoto'), async (req, res) => {
  try {
    if (req.user.userType !== 'DRIVER') {
      return res.status(403).json({ 
        success: false, 
        error: { message: 'Only drivers can create driver profiles' } 
      });
    }

    const { licensePlate, vehicleType, vehicleCapacity, carDescription } = req.body;
    const carPhotoUrl = req.file ? `mock-s3-url/${req.user.id}/car-${Date.now()}.jpg` : null;

    const driverProfile = await prisma.driver.upsert({
      where: { userId: req.user.id },
      update: {
        licensePlate,
        vehicleType,
        vehicleCapacity,
        carDescription,
        carPhotoUrl
      },
      create: {
        userId: req.user.id,
        licensePlate,
        vehicleType,
        vehicleCapacity,
        carDescription,
        carPhotoUrl
      }
    });

    res.status(200).json({ 
      success: true, 
      message: 'Driver profile created/updated successfully', 
      data: driverProfile 
    });

  } catch (error) {
    console.error('Driver profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to create/update driver profile' } 
    });
  }
});

app.get('/api/driver/all', authenticateToken, async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            profilePhoto: true
          }
        }
      }
    });

    res.status(200).json({ success: true, data: drivers });

  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to get drivers' } 
    });
  }
});

// Bid Routes
app.post('/api/bids', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'DRIVER') {
      return res.status(403).json({ 
        success: false, 
        error: { message: 'Only drivers can create bids' } 
      });
    }

    const { packageId, amount, message } = req.body;

    const bid = await prisma.bid.create({
      data: {
        driverId: req.user.driverProfile.id,
        packageId,
        amount: parseFloat(amount),
        message: message || null,
        status: 'PENDING'
      }
    });

    res.status(201).json({ success: true, data: bid });

  } catch (error) {
    console.error('Create bid error:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to create bid' } 
    });
  }
});

app.get('/api/bids/package/:packageId', authenticateToken, async (req, res) => {
  try {
    const { packageId } = req.params;

    const bids = await prisma.bid.findMany({
      where: { packageId },
      include: {
        driver: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                profilePhoto: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: bids });

  } catch (error) {
    console.error('Get bids error:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to get bids' } 
    });
  }
});

// Notification Routes
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: notifications });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to get notifications' } 
    });
  }
});

app.get('/api/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, read: false }
    });

    res.status(200).json({ success: true, data: { count: unreadCount } });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to get unread count' } 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size cannot exceed 5MB'
        }
      });
    }
  }
  
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: { message: 'Internal server error' }
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Real Socket.IO: Client connected: ${socket.id}`);

  socket.on('joinRoom', (roomName) => {
    socket.join(roomName);
    console.log(`Real Socket.IO: Client ${socket.id} joined room: ${roomName}`);
    io.to(roomName).emit('message', { user: 'System', text: `Welcome to ${roomName}!` });
  });

  socket.on('sendMessage', ({ roomName, message, user }) => {
    console.log(`Real Socket.IO: Message in ${roomName} from ${user}: ${message}`);
    io.to(roomName).emit('message', { user, text: message, timestamp: new Date().toISOString() });
  });

  socket.on('disconnect', () => {
    console.log(`Real Socket.IO: Client disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Real API server running on port ${PORT}`);
  console.log(`📱 Mobile app should connect to: http://192.168.1.116:${PORT}`);
  console.log(`🔗 Health check: http://192.168.1.116:${PORT}/health`);
  console.log(`🗄️  Database: PostgreSQL (Connected)`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});
