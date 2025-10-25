-- Database Performance Optimization Scripts
-- This file contains SQL scripts to optimize database performance

-- ==============================================
-- 1. INDEX OPTIMIZATION
-- ==============================================

-- User table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_email ON "User"(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_userType ON "User"(userType);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_createdAt ON "User"(createdAt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_identityVerified ON "User"(identityVerified);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_emailVerified ON "User"(emailVerified);

-- Package table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_package_customerId ON "Package"(customerId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_package_status ON "Package"(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_package_createdAt ON "Package"(createdAt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_package_pickup_location ON "Package"(pickupLat, pickupLng);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_package_delivery_location ON "Package"(deliveryLat, deliveryLng);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_package_price_range ON "Package"(priceOffered);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_package_size ON "Package"(size);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_package_weight ON "Package"(weight);

-- Trip table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_driverId ON "Trip"(driverId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_status ON "Trip"(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_departureTime ON "Trip"(departureTime);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_start_location ON "Trip"(startLat, startLng);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_end_location ON "Trip"(endLat, endLng);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_capacity ON "Trip"(availableCapacity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_createdAt ON "Trip"(createdAt);

-- Bid table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bid_packageId ON "Bid"(packageId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bid_driverId ON "Bid"(driverId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bid_tripId ON "Bid"(tripId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bid_status ON "Bid"(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bid_createdAt ON "Bid"(createdAt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bid_amount ON "Bid"(amount);

-- Wallet table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_userId ON "Wallet"(userId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_balance ON "Wallet"(availableBalance);

-- Transaction table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transaction_userId ON "Transaction"(userId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transaction_type ON "Transaction"(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transaction_status ON "Transaction"(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transaction_createdAt ON "Transaction"(createdAt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transaction_amount ON "Transaction"(amount);

-- Chat and messaging indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chatroom_packageId ON "ChatRoom"(packageId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chatroom_customerId ON "ChatRoom"(customerId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chatroom_driverId ON "ChatRoom"(driverId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chatroom_status ON "ChatRoom"(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chatmessage_chatRoomId ON "ChatMessage"(chatRoomId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chatmessage_senderId ON "ChatMessage"(senderId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chatmessage_createdAt ON "ChatMessage"(createdAt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chatmessage_isRead ON "ChatMessage"(isRead);

-- Notification indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_userId ON "Notification"(userId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_type ON "Notification"(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_isRead ON "Notification"(isRead);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_createdAt ON "Notification"(createdAt);

-- Package tracking indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_packagetracking_packageId ON "PackageTracking"(packageId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_packagetracking_status ON "PackageTracking"(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_packagetracking_timestamp ON "PackageTracking"(timestamp);

-- Verification indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_verification_userId ON "Verification"(userId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_verification_status ON "Verification"(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_verification_createdAt ON "Verification"(createdAt);

-- Driver indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_userId ON "Driver"(userId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_rating ON "Driver"(rating);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_active ON "Driver"(active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_vehicleType ON "Driver"(vehicleType);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_vehicleCapacity ON "Driver"(vehicleCapacity);

-- Commission reservation indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commissionreservation_driverId ON "CommissionReservation"(driverId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commissionreservation_tripId ON "CommissionReservation"(tripId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commissionreservation_status ON "CommissionReservation"(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_commissionreservation_expiresAt ON "CommissionReservation"(expiresAt);

-- ==============================================
-- 2. COMPOSITE INDEXES FOR COMMON QUERIES
-- ==============================================

-- Package search optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_package_search ON "Package"(status, createdAt DESC, priceOffered);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_package_location_status ON "Package"(status, pickupLat, pickupLng);

-- Trip search optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_search ON "Trip"(status, departureTime, availableCapacity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_location_time ON "Trip"(startLat, startLng, departureTime);

-- Bid management optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bid_package_status ON "Bid"(packageId, status, createdAt DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bid_driver_status ON "Bid"(driverId, status, createdAt DESC);

-- User activity optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity ON "User"(userType, createdAt DESC);

-- ==============================================
-- 3. PARTIAL INDEXES FOR SPECIFIC CONDITIONS
-- ==============================================

-- Active users only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_active ON "User"(email) WHERE identityVerified = true;

-- Pending packages only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_package_pending ON "Package"(createdAt DESC) WHERE status = 'PENDING';

-- Active trips only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trip_active ON "Trip"(departureTime) WHERE status = 'SCHEDULED';

-- Unread notifications only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_unread ON "Notification"(userId, createdAt DESC) WHERE isRead = false;

-- Unread messages only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chatmessage_unread ON "ChatMessage"(chatRoomId, createdAt DESC) WHERE isRead = false;

-- ==============================================
-- 4. QUERY OPTIMIZATION VIEWS
-- ==============================================

-- Active drivers with ratings
CREATE OR REPLACE VIEW active_drivers AS
SELECT 
    d.id,
    d.userId,
    d.rating,
    d.totalDeliveries,
    d.vehicleType,
    d.vehicleCapacity,
    u.firstName,
    u.lastName,
    u.phone
FROM "Driver" d
JOIN "User" u ON d.userId = u.id
WHERE d.active = true AND u.identityVerified = true;

-- Package statistics
CREATE OR REPLACE VIEW package_stats AS
SELECT 
    status,
    COUNT(*) as count,
    AVG(priceOffered) as avg_price,
    MIN(priceOffered) as min_price,
    MAX(priceOffered) as max_price
FROM "Package"
GROUP BY status;

-- Trip statistics
CREATE OR REPLACE VIEW trip_stats AS
SELECT 
    status,
    availableCapacity,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (arrivalTime - departureTime))/3600) as avg_duration_hours
FROM "Trip"
WHERE arrivalTime IS NOT NULL
GROUP BY status, availableCapacity;

-- ==============================================
-- 5. DATABASE CONFIGURATION OPTIMIZATIONS
-- ==============================================

-- Update PostgreSQL configuration for better performance
-- (These should be set in postgresql.conf or via environment variables)

-- Memory settings
-- shared_buffers = 256MB (or 25% of RAM)
-- effective_cache_size = 1GB (or 75% of RAM)
-- work_mem = 4MB
-- maintenance_work_mem = 64MB

-- Connection settings
-- max_connections = 100
-- shared_preload_libraries = 'pg_stat_statements'

-- Query optimization
-- random_page_cost = 1.1 (for SSD)
-- effective_io_concurrency = 200 (for SSD)
-- checkpoint_completion_target = 0.9
-- wal_buffers = 16MB

-- ==============================================
-- 6. MAINTENANCE PROCEDURES
-- ==============================================

-- Function to update table statistics
CREATE OR REPLACE FUNCTION update_table_stats()
RETURNS void AS $$
BEGIN
    ANALYZE "User";
    ANALYZE "Package";
    ANALYZE "Trip";
    ANALYZE "Bid";
    ANALYZE "Wallet";
    ANALYZE "Transaction";
    ANALYZE "ChatRoom";
    ANALYZE "ChatMessage";
    ANALYZE "Notification";
    ANALYZE "PackageTracking";
    ANALYZE "Verification";
    ANALYZE "Driver";
    ANALYZE "CommissionReservation";
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Delete old notifications (older than 30 days)
    DELETE FROM "Notification" 
    WHERE createdAt < NOW() - INTERVAL '30 days' AND isRead = true;
    
    -- Delete old package tracking records (older than 90 days)
    DELETE FROM "PackageTracking" 
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    -- Delete expired commission reservations
    DELETE FROM "CommissionReservation" 
    WHERE expiresAt < NOW() AND status = 'PENDING';
    
    -- Delete old low balance notifications (older than 7 days)
    DELETE FROM "LowBalanceNotification" 
    WHERE notifiedAt < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 7. MONITORING QUERIES
-- ==============================================

-- Query to find slow queries
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Query to find unused indexes
CREATE OR REPLACE VIEW unused_indexes AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_tup_read = 0 AND idx_tup_fetch = 0;

-- Query to find table sizes
CREATE OR REPLACE VIEW table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
