# NTSAMAELA - FUNCTIONAL REQUIREMENTS PROMPT

## 🎯 PROJECT OVERVIEW
Create a mobile app UI for **Ntsamaela** - a peer-to-peer package delivery platform connecting customers with drivers in Botswana.

## 📱 APP CONCEPT
**Ntsamaela** is a delivery platform where:
- **Customers** can create package delivery requests and track them in real-time
- **Drivers** can browse available packages, place bids, and manage deliveries
- **Real-time tracking** with GPS integration
- **Secure payments** with commission system (30% platform fee)
- **Rating system** for quality assurance
- **Currency**: Botswana Pula (P)

## 📋 COMPLETE SCREEN INVENTORY

### **1. AUTHENTICATION SCREENS**

#### **Login Screen**
- Clean, minimal design
- App logo at top
- Email/phone input field
- Password input field
- "Login" button (primary blue)
- "Forgot Password?" link
- "Don't have an account? Sign Up" link
- Social login options (optional)

#### **Registration Screen**
- User type selection (Customer/Driver)
- Personal information form
- Email verification
- Terms & conditions checkbox
- "Create Account" button
- "Already have an account? Login" link

#### **Forgot Password Screen**
- Email input field
- "Send Reset Link" button
- Back to login link

### **2. ONBOARDING & PERMISSIONS**

#### **Permissions Screen** (First-time users only)
- Welcome message
- Permission requests with explanations:
  - Location access (required for tracking)
  - Camera access (for package photos)
  - Storage access (for documents)
  - Phone access (for verification)
  - Notifications (for updates)
- "Grant Permissions" button
- Skip option for non-essential permissions

### **3. MAIN NAVIGATION**

#### **Bottom Tab Navigation**
- **Home** (🏠) - Main dashboard
- **Share** (📤) - App sharing
- **Profile** (👤) - User profile
- **Settings** (⚙️) - App settings

### **4. HOME SCREEN (Dual Interface)**

#### **Customer Home Screen**
- **Header**: User name, profile photo, greeting
- **Quick Stats**: Total deliveries, wallet balance, rating
- **Action Cards**:
  - "📦 Create Package" (primary action)
  - "📊 My Packages" 
  - "💰 Wallet"
  - "📍 Track Package"
- **Recent Activity**: List of recent packages
- **Quick Actions**: Emergency delivery, scheduled delivery

#### **Driver Home Screen**
- **Header**: Driver name, profile photo, availability status
- **Quick Stats**: Completed trips, earnings, rating
- **Action Cards**:
  - "🚚 Find Packages" (primary action)
  - "📊 My Trips"
  - "💰 Earnings"
  - "📍 Route Optimizer"
- **Recent Activity**: List of recent trips
- **Status Toggle**: Active/Inactive slider

### **5. PACKAGE MANAGEMENT**

#### **Create Package Screen**
- **Package Details Form**:
  - Description (required)
  - Pickup address with map
  - Delivery address with map
  - Package type (documents, electronics, etc.)
  - Weight/size
  - Urgency level (normal, urgent, same-day)
  - Special instructions
- **Photo Section**: Add package photos (camera/gallery)
- **Pricing**: Suggested price based on distance/weight
- **Submit Button**: "Create Package Request"

#### **My Packages Screen (Customer)**
- **Package Cards** with:
  - Package description
  - Pickup/delivery addresses
  - Status (Active, In Transit, Delivered)
  - Photos (if added)
  - Bids count
  - Actions: "View Bids", "Cancel"
- **Filter Options**: All, Active, Completed, Cancelled
- **Search Functionality**

#### **Available Packages Screen (Driver)**
- **Package Cards** with:
  - Package description
  - Pickup/delivery addresses
  - Distance and estimated time
  - Customer offered price
  - Urgency indicator
  - Package photos
- **Action Buttons**: "✅ Accept" and "💰 Counter Bid"
- **Filter Options**: Distance, price range, urgency
- **Search Functionality**

### **6. BIDDING SYSTEM**

#### **Review Bids Screen (Customer)**
- **Package Information** header
- **Bid Cards** showing:
  - Driver name and photo
  - Driver rating and completed trips
  - Bid amount
  - Estimated delivery time
  - Driver message
  - Vehicle information
- **Actions**: "Accept Bid" or "Counter Bid"
- **Counter Bid Modal**: Amount input with keyboard avoidance

#### **My Bids Screen (Driver)**
- **Bid Status Tabs**: Active, Won, Lost
- **Bid Cards** with:
  - Package details
  - Bid amount
  - Status
  - Customer information
- **Actions**: Edit bid, withdraw bid

### **7. TRIP MANAGEMENT**

#### **My Trips Screen (Driver)**
- **Trip Status Tabs**: Active, Completed, Planned
- **Trip Cards** with:
  - Package details
  - Customer information
  - Pickup/delivery addresses
  - Status and timeline
  - Earnings
- **Actions**: Start trip, complete delivery, contact customer

#### **Trip Details Screen**
- **Customer Information**
- **Package Details**
- **Route Map** with real-time tracking
- **Contact Options**: Call, message
- **Delivery Actions**: Mark picked up, mark delivered
- **Emergency Options**: Report issue, cancel trip

### **8. TRACKING & NAVIGATION**

#### **Live Tracking Screen**
- **Real-time Map** with driver location
- **Package Status** timeline
- **Estimated Arrival** time
- **Contact Driver** button
- **Location Services** warning (if disabled)

#### **Route Optimizer Screen**
- **Current Location** display
- **Package Selection** for multiple deliveries
- **Optimization Options**: Time, distance, fuel efficiency
- **Route Preview** with map
- **Start Optimized Route** button

### **9. WALLET & PAYMENTS**

#### **Wallet Screen**
- **Account Balance** prominently displayed
- **Reserved Amount** (for active packages)
- **Action Buttons**:
  - "Withdraw" (for drivers)
  - "Fund Wallet" (for customers)
- **Transaction History**
- **Earnings Statistics** (for drivers)

#### **Withdraw Funds Modal**
- **Available Balance** display
- **Withdrawal Amount** input
- **Bank Account** selection
- **Confirm Withdrawal** button

#### **Fund Wallet Modal**
- **Payment Methods**: Visa card, mobile money
- **Amount Input** (minimum P50)
- **Payment Confirmation**

### **10. PROFILE & SETTINGS**

#### **Profile Screen**
- **Profile Header** with:
  - Large profile photo
  - User name and email
  - User type (Customer/Driver)
  - Quick stats (deliveries, earnings, rating)
- **Profile Information**:
  - Personal details
  - Contact information
  - Vehicle information (for drivers)
- **Edit Profile** button
- **Driver Status Toggle** (Active/Inactive slider)

#### **Settings Screen**
- **Account Settings**:
  - Edit profile
  - Change password
  - Notification preferences
  - Privacy settings
- **App Settings**:
  - Language selection
  - Currency settings
  - Location services
- **Support**:
  - Help center
  - Contact support
  - Report issue
- **Legal**:
  - Terms of service
  - Privacy policy
- **Logout** button

### **11. VERIFICATION SYSTEM**

#### **Verification Screen**
- **Dynamic Title**: "Customer Verification" or "Driver Verification"
- **Document Upload**:
  - ID Card (front/back)
  - Selfie photo
  - Driver License (drivers only)
- **Photo Preview** functionality
- **Upload Progress** indicators
- **Verification Status** display

### **12. COMMUNICATION**

#### **Messages Screen**
- **Chat List** with customers/drivers
- **Message Threads** with:
  - Timestamp
  - Message status
  - Quick reply options
- **New Message** button

#### **Chat Screen**
- **Message Bubbles** (sent/received)
- **Typing Indicators**
- **Message Input** with send button
- **Quick Actions**: Call, share location

### **13. NOTIFICATIONS**

#### **Notifications Screen**
- **Notification Categories**:
  - Package updates
  - Payment notifications
  - System messages
- **Notification Cards** with:
  - Icon and title
  - Description
  - Timestamp
  - Action buttons
- **Mark as Read** functionality

### **14. SHARING & REFERRAL**

#### **Share Screen**
- **App Sharing** card with download link
- **Referral Program** information
- **Social Sharing** options
- **Download Links** for App Store/Play Store

## 🔧 TECHNICAL REQUIREMENTS

### **Platform**
- **Mobile App**: React Native/Expo
- **Screen Orientation**: Portrait only
- **Target Devices**: iOS and Android smartphones

### **Core Functionality**
- **Real-time GPS tracking**
- **Push notifications**
- **Camera integration** for package photos
- **Payment processing** integration
- **Offline capability** for basic functions

## 📱 SCREEN FLOWS

### **Customer Journey**
1. Login → Home → Create Package → Review Bids → Accept Bid → Track Delivery → Rate Driver
2. Home → My Packages → View Package Details → Track Package
3. Home → Wallet → Fund Account → Payment Confirmation

### **Driver Journey**
1. Login → Home → Find Packages → Place Bid → Accept Package → Start Trip → Complete Delivery
2. Home → My Trips → Trip Details → Navigation → Delivery Confirmation
3. Home → Earnings → Withdraw Funds → Bank Transfer

## 🎯 KEY FEATURES

### **Real-time Features**
- **Live Tracking**: GPS-based package tracking
- **Push Notifications**: Instant updates
- **Status Updates**: Real-time package status changes

### **Payment Integration**
- **Secure Payments**: Stripe/Paystack integration
- **Commission System**: 30% platform fee
- **Wallet System**: In-app balance management

### **Quality Assurance**
- **Rating System**: 5-star rating for drivers
- **Verification**: Document verification system
- **Support**: 24/7 customer support

## 📋 DELIVERABLES EXPECTED

### **Design Files**
- **Figma/Adobe XD** project files
- **Screen Mockups** for all screens listed above
- **Component Library** with all UI elements
- **User Flow** diagrams

### **Assets**
- **High-resolution** images for all screens
- **Loading states** and animations
- **Error states** and empty states

---

**Note**: This prompt covers all screens and functionality for the Ntsamaela app. The AI designer will determine the visual design, color schemes, typography, and overall aesthetic approach.
