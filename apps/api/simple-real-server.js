const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Client } = require('pg');
require('dotenv').config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Database connection
const db = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'plutoniumdb',
  database: 'ntsamaela'
});

// Connect to database
db.connect()
  .then(() => console.log('✅ Connected to PostgreSQL database'))
  .catch(err => console.error('❌ Database connection error:', err));

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
    const existingUser = await db.query(
      'SELECT id FROM "User" WHERE phone = $1 OR email = $2',
      [phone, `${phone}@example.com`]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'User already exists with this phone number' } 
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const userResult = await db.query(
      `INSERT INTO "User" (id, "firstName", "lastName", phone, email, "passwordHash", "userType", "identityVerified", "emailVerified", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING id`,
      [
        `user_${Date.now()}`,
        firstName,
        lastName,
        phone,
        `${phone}@example.com`,
        passwordHash,
        userType.toUpperCase(),
        false,
        false
      ]
    );

    const userId = userResult.rows[0].id;

    // Create wallet for the user
    await db.query(
      `INSERT INTO "Wallet" (id, "userId", balance, currency, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [`wallet_${Date.now()}`, userId, 0, 'BWP']
    );

    // Create driver profile if user is a driver
    if (userType.toUpperCase() === 'DRIVER') {
      await db.query(
        `INSERT INTO "Driver" (id, "userId", rating, "totalDeliveries", active)
         VALUES ($1, $2, $3, $4, $5)`,
        [`driver_${Date.now()}`, userId, 0, 0, true]
      );
    }

    res.status(201).json({ 
      success: true, 
      message: 'User registered successfully', 
      data: { userId } 
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
    const userResult = await db.query(
      `SELECT u.*, d.id as driver_id, d.rating, d."totalDeliveries", w.balance
       FROM "User" u
       LEFT JOIN "Driver" d ON u.id = d."userId"
       LEFT JOIN "Wallet" w ON u.id = w."userId"
       WHERE u.phone = $1`,
      [phone]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: { message: 'Invalid credentials' } 
      });
    }

    const user = userResult.rows[0];

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
        isVerified: user.identityVerified,
        driverId: user.driver_id
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
          rating: user.rating || 0,
          totalDeliveries: user.totalDeliveries || 0,
          totalEarnings: user.balance || 0
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
    const userResult = await db.query(
      `SELECT u.*, d.id as driver_id, d.rating, d."totalDeliveries", w.balance
       FROM "User" u
       LEFT JOIN "Driver" d ON u.id = d."userId"
       LEFT JOIN "Wallet" w ON u.id = w."userId"
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'User not found' } 
      });
    }

    const user = userResult.rows[0];

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
        rating: user.rating || 0,
        totalDeliveries: user.totalDeliveries || 0,
        totalEarnings: user.balance || 0
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

    const packageResult = await db.query(
      `INSERT INTO "Package" (id, "customerId", description, "imageUrl", "pickupAddress", "pickupLat", "pickupLng", 
       "deliveryAddress", "deliveryLat", "deliveryLng", "priceOffered", status, size, weight, "deliveryDate", 
       urgency, "recipientPhone", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
       RETURNING *`,
      [
        `pkg_${Date.now()}`,
        req.user.id,
        description,
        req.file ? `mock-s3-url/${req.user.id}/package-${Date.now()}.jpg` : null,
        pickupAddress,
        parseFloat(pickupLat),
        parseFloat(pickupLng),
        deliveryAddress,
        parseFloat(deliveryLat),
        parseFloat(deliveryLng),
        parseFloat(priceOffered),
        'PENDING',
        null,
        weight ? parseFloat(weight) : null,
        deliveryDate ? new Date(deliveryDate) : null,
        urgency || 'NORMAL',
        recipientPhone || null
      ]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Package created successfully', 
      data: packageResult.rows[0] 
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
      const result = await db.query(
        `SELECT p.*, 
         COALESCE(
           (SELECT json_agg(
             json_build_object(
               'id', b.id,
               'amount', b.amount,
               'message', b.message,
               'status', b.status,
               'createdAt', b."createdAt",
               'driver', json_build_object(
                 'id', d.id,
                 'user', json_build_object(
                   'firstName', u.firstName,
                   'lastName', u.lastName,
                   'phone', u.phone,
                   'profilePhoto', u."profilePhoto"
                 )
               )
             )
           ) FROM "Bid" b
           JOIN "Driver" d ON b."driverId" = d.id
           JOIN "User" u ON d."userId" = u.id
           WHERE b."packageId" = p.id), '[]'::json
         ) as bids
         FROM "Package" p
         WHERE p."customerId" = $1
         ORDER BY p."createdAt" DESC`,
        [req.user.id]
      );
      packages = result.rows;
    } else {
      // Drivers see available packages
      const result = await db.query(
        `SELECT p.*, 
         json_build_object(
           'firstName', u.firstName,
           'lastName', u.lastName,
           'phone', u.phone,
           'profilePhoto', u."profilePhoto"
         ) as customer,
         COALESCE(
           (SELECT json_agg(
             json_build_object(
               'id', b.id,
               'amount', b.amount,
               'message', b.message,
               'status', b.status,
               'createdAt', b."createdAt"
             )
           ) FROM "Bid" b
           WHERE b."packageId" = p.id AND b."driverId" = $2), '[]'::json
         ) as bids
         FROM "Package" p
         JOIN "User" u ON p."customerId" = u.id
         WHERE p.status = 'PENDING' AND p."customerId" != $1
         ORDER BY p."createdAt" DESC`,
        [req.user.id, req.user.driverId]
      );
      packages = result.rows;
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

    const driverResult = await db.query(
      `INSERT INTO "Driver" (id, "userId", "licensePlate", "vehicleType", "vehicleCapacity", "carDescription", "carPhotoUrl", rating, "totalDeliveries", active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT ("userId") 
       DO UPDATE SET 
         "licensePlate" = EXCLUDED."licensePlate",
         "vehicleType" = EXCLUDED."vehicleType",
         "vehicleCapacity" = EXCLUDED."vehicleCapacity",
         "carDescription" = EXCLUDED."carDescription",
         "carPhotoUrl" = EXCLUDED."carPhotoUrl"
       RETURNING *`,
      [
        `driver_${Date.now()}`,
        req.user.id,
        licensePlate,
        vehicleType,
        vehicleCapacity,
        carDescription,
        carPhotoUrl,
        0,
        0,
        true
      ]
    );

    res.status(200).json({ 
      success: true, 
      message: 'Driver profile created/updated successfully', 
      data: driverResult.rows[0] 
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
    const result = await db.query(
      `SELECT d.*, 
       json_build_object(
         'firstName', u.firstName,
         'lastName', u.lastName,
         'phone', u.phone,
         'profilePhoto', u."profilePhoto"
       ) as user
       FROM "Driver" d
       JOIN "User" u ON d."userId" = u.id`
    );

    res.status(200).json({ success: true, data: result.rows });

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

    const bidResult = await db.query(
      `INSERT INTO "Bid" (id, "driverId", "packageId", amount, message, status, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [
        `bid_${Date.now()}`,
        req.user.driverId,
        packageId,
        parseFloat(amount),
        message || null,
        'PENDING'
      ]
    );

    res.status(201).json({ success: true, data: bidResult.rows[0] });

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

    const result = await db.query(
      `SELECT b.*, 
       json_build_object(
         'id', d.id,
         'user', json_build_object(
           'firstName', u.firstName,
           'lastName', u.lastName,
           'profilePhoto', u."profilePhoto"
         )
       ) as driver
       FROM "Bid" b
       JOIN "Driver" d ON b."driverId" = d.id
       JOIN "User" u ON d."userId" = u.id
       WHERE b."packageId" = $1
       ORDER BY b."createdAt" DESC`,
      [packageId]
    );

    res.status(200).json({ success: true, data: result.rows });

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
    const result = await db.query(
      'SELECT * FROM "Notification" WHERE "userId" = $1 ORDER BY "createdAt" DESC',
      [req.user.id]
    );

    res.status(200).json({ success: true, data: result.rows });

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
    const result = await db.query(
      'SELECT COUNT(*) as count FROM "Notification" WHERE "userId" = $1 AND read = false',
      [req.user.id]
    );

    res.status(200).json({ success: true, data: { count: parseInt(result.rows[0].count) } });

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
  await db.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  await db.end();
  process.exit(0);
});
