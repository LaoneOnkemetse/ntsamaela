#!/bin/bash

# Production Build Script for Ntsamaela Mobile App
# This script builds production-ready apps for iOS and Android

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="Ntsamaela"
IOS_SCHEME="Ntsamaela"
ANDROID_BUILD_TYPE="release"
BUILD_NUMBER=$(date +%Y%m%d%H%M%S)
VERSION_NAME="1.0.0"

# Directories
MOBILE_DIR="apps/mobile"
IOS_DIR="$MOBILE_DIR/ios"
ANDROID_DIR="$MOBILE_DIR/android"
BUILD_DIR="builds"
IOS_BUILD_DIR="$BUILD_DIR/ios"
ANDROID_BUILD_DIR="$BUILD_DIR/android"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if we're in the right directory
    if [ ! -d "$MOBILE_DIR" ]; then
        log_error "Mobile app directory not found: $MOBILE_DIR"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm/yarn
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check React Native CLI
    if ! command -v react-native &> /dev/null; then
        log_warning "React Native CLI not found, installing..."
        npm install -g @react-native-community/cli
    fi
    
    log_success "Prerequisites check completed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    cd "$MOBILE_DIR"
    
    # Install npm dependencies
    npm install
    
    # Install iOS dependencies
    if [ -d "$IOS_DIR" ]; then
        cd "$IOS_DIR"
        if command -v pod &> /dev/null; then
            pod install
        else
            log_warning "CocoaPods not found, skipping iOS dependencies"
        fi
        cd - > /dev/null
    fi
    
    cd - > /dev/null
    
    log_success "Dependencies installed"
}

# Clean previous builds
clean_builds() {
    log_info "Cleaning previous builds..."
    
    # Clean React Native
    cd "$MOBILE_DIR"
    npx react-native clean
    
    # Clean iOS
    if [ -d "$IOS_DIR" ]; then
        cd "$IOS_DIR"
        xcodebuild clean -workspace "$PROJECT_NAME.xcworkspace" -scheme "$IOS_SCHEME"
        cd - > /dev/null
    fi
    
    # Clean Android
    if [ -d "$ANDROID_DIR" ]; then
        cd "$ANDROID_DIR"
        ./gradlew clean
        cd - > /dev/null
    fi
    
    # Remove build directories
    rm -rf "$BUILD_DIR"
    mkdir -p "$IOS_BUILD_DIR" "$ANDROID_BUILD_DIR"
    
    cd - > /dev/null
    
    log_success "Builds cleaned"
}

# Build iOS app
build_ios() {
    log_info "Building iOS app..."
    
    if [ ! -d "$IOS_DIR" ]; then
        log_warning "iOS directory not found, skipping iOS build"
        return 0
    fi
    
    cd "$IOS_DIR"
    
    # Check if Xcode is available
    if ! command -v xcodebuild &> /dev/null; then
        log_error "Xcode is not installed or not in PATH"
        return 1
    fi
    
    # Build for App Store
    log_info "Building for App Store distribution..."
    xcodebuild archive \
        -workspace "$PROJECT_NAME.xcworkspace" \
        -scheme "$IOS_SCHEME" \
        -configuration Release \
        -archivePath "../../$IOS_BUILD_DIR/$PROJECT_NAME.xcarchive" \
        -allowProvisioningUpdates \
        CODE_SIGN_STYLE=Manual \
        PROVISIONING_PROFILE_SPECIFIER="Ntsamaela Distribution Profile" \
        CODE_SIGN_IDENTITY="iPhone Distribution" \
        MARKETING_VERSION="$VERSION_NAME" \
        CURRENT_PROJECT_VERSION="$BUILD_NUMBER"
    
    if [ $? -eq 0 ]; then
        log_success "iOS archive created successfully"
        
        # Export IPA
        log_info "Exporting IPA..."
        xcodebuild -exportArchive \
            -archivePath "../../$IOS_BUILD_DIR/$PROJECT_NAME.xcarchive" \
            -exportPath "../../$IOS_BUILD_DIR" \
            -exportOptionsPlist "../../$IOS_BUILD_DIR/ExportOptions.plist"
        
        if [ $? -eq 0 ]; then
            log_success "iOS IPA exported successfully"
        else
            log_error "Failed to export iOS IPA"
            return 1
        fi
    else
        log_error "Failed to create iOS archive"
        return 1
    fi
    
    cd - > /dev/null
}

# Build Android app
build_android() {
    log_info "Building Android app..."
    
    if [ ! -d "$ANDROID_DIR" ]; then
        log_warning "Android directory not found, skipping Android build"
        return 0
    fi
    
    cd "$ANDROID_DIR"
    
    # Check if Android SDK is available
    if [ -z "$ANDROID_HOME" ]; then
        log_error "ANDROID_HOME environment variable is not set"
        return 1
    fi
    
    # Build release APK
    log_info "Building release APK..."
    ./gradlew assembleRelease \
        -PversionName="$VERSION_NAME" \
        -PversionCode="$BUILD_NUMBER"
    
    if [ $? -eq 0 ]; then
        log_success "Android APK built successfully"
        
        # Copy APK to build directory
        cp "app/build/outputs/apk/release/app-release.apk" "../../$ANDROID_BUILD_DIR/$PROJECT_NAME-$VERSION_NAME.apk"
        
        # Build App Bundle for Play Store
        log_info "Building App Bundle for Play Store..."
        ./gradlew bundleRelease \
            -PversionName="$VERSION_NAME" \
            -PversionCode="$BUILD_NUMBER"
        
        if [ $? -eq 0 ]; then
            log_success "Android App Bundle built successfully"
            
            # Copy AAB to build directory
            cp "app/build/outputs/bundle/release/app-release.aab" "../../$ANDROID_BUILD_DIR/$PROJECT_NAME-$VERSION_NAME.aab"
        else
            log_error "Failed to build Android App Bundle"
            return 1
        fi
    else
        log_error "Failed to build Android APK"
        return 1
    fi
    
    cd - > /dev/null
}

# Generate build artifacts
generate_build_artifacts() {
    log_info "Generating build artifacts..."
    
    # Create build info file
    cat > "$BUILD_DIR/build-info.json" << EOF
{
  "project": "$PROJECT_NAME",
  "version": "$VERSION_NAME",
  "buildNumber": "$BUILD_NUMBER",
  "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "platforms": {
    "ios": {
      "enabled": $([ -d "$IOS_DIR" ] && echo "true" || echo "false"),
      "scheme": "$IOS_SCHEME",
      "archive": "$PROJECT_NAME.xcarchive",
      "ipa": "$PROJECT_NAME.ipa"
    },
    "android": {
      "enabled": $([ -d "$ANDROID_DIR" ] && echo "true" || echo "false"),
      "buildType": "$ANDROID_BUILD_TYPE",
      "apk": "$PROJECT_NAME-$VERSION_NAME.apk",
      "aab": "$PROJECT_NAME-$VERSION_NAME.aab"
    }
  },
  "environment": "production",
  "git": {
    "commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
  }
}
EOF
    
    # Create iOS ExportOptions.plist
    cat > "$IOS_BUILD_DIR/ExportOptions.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
    <key>destination</key>
    <string>export</string>
    <key>signingStyle</key>
    <string>manual</string>
    <key>provisioningProfiles</key>
    <dict>
        <key>com.ntsamaela.mobile</key>
        <string>Ntsamaela Distribution Profile</string>
    </dict>
</dict>
</plist>
EOF
    
    # Create build summary
    cat > "$BUILD_DIR/build-summary.md" << EOF
# Build Summary - $PROJECT_NAME

**Build Date:** $(date)
**Version:** $VERSION_NAME
**Build Number:** $BUILD_NUMBER

## Build Artifacts

### iOS
- **Archive:** \`$PROJECT_NAME.xcarchive\`
- **IPA:** \`$PROJECT_NAME.ipa\`
- **Scheme:** $IOS_SCHEME
- **Configuration:** Release

### Android
- **APK:** \`$PROJECT_NAME-$VERSION_NAME.apk\`
- **App Bundle:** \`$PROJECT_NAME-$VERSION_NAME.aab\`
- **Build Type:** $ANDROID_BUILD_TYPE

## Next Steps

1. **iOS App Store:**
   - Upload IPA to App Store Connect
   - Submit for review
   - Configure app metadata

2. **Google Play Store:**
   - Upload AAB to Google Play Console
   - Configure store listing
   - Submit for review

## Build Environment

- **Node.js:** $(node --version)
- **npm:** $(npm --version)
- **React Native:** $(npx react-native --version 2>/dev/null || echo "Unknown")
- **Git Commit:** $(git rev-parse HEAD 2>/dev/null || echo "Unknown")
- **Git Branch:** $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "Unknown")

## Files Generated

\`\`\`
$BUILD_DIR/
├── build-info.json
├── build-summary.md
├── ios/
│   ├── $PROJECT_NAME.xcarchive
│   ├── $PROJECT_NAME.ipa
│   └── ExportOptions.plist
└── android/
    ├── $PROJECT_NAME-$VERSION_NAME.apk
    └── $PROJECT_NAME-$VERSION_NAME.aab
\`\`\`
EOF
    
    log_success "Build artifacts generated"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    cd "$MOBILE_DIR"
    
    # Run unit tests
    log_info "Running unit tests..."
    npm test -- --coverage --watchAll=false
    
    if [ $? -eq 0 ]; then
        log_success "Unit tests passed"
    else
        log_error "Unit tests failed"
        return 1
    fi
    
    # Run E2E tests
    log_info "Running E2E tests..."
    npm run test:e2e -- --configuration production
    
    if [ $? -eq 0 ]; then
        log_success "E2E tests passed"
    else
        log_error "E2E tests failed"
        return 1
    fi
    
    cd - > /dev/null
}

# Validate builds
validate_builds() {
    log_info "Validating builds..."
    
    # Validate iOS build
    if [ -f "$IOS_BUILD_DIR/$PROJECT_NAME.ipa" ]; then
        log_info "Validating iOS IPA..."
        # Check IPA size
        IPA_SIZE=$(du -h "$IOS_BUILD_DIR/$PROJECT_NAME.ipa" | cut -f1)
        log_info "iOS IPA size: $IPA_SIZE"
        
        # Check if IPA is valid
        if [ -s "$IOS_BUILD_DIR/$PROJECT_NAME.ipa" ]; then
            log_success "iOS IPA is valid"
        else
            log_error "iOS IPA is empty or corrupted"
            return 1
        fi
    fi
    
    # Validate Android builds
    if [ -f "$ANDROID_BUILD_DIR/$PROJECT_NAME-$VERSION_NAME.apk" ]; then
        log_info "Validating Android APK..."
        APK_SIZE=$(du -h "$ANDROID_BUILD_DIR/$PROJECT_NAME-$VERSION_NAME.apk" | cut -f1)
        log_info "Android APK size: $APK_SIZE"
        
        if [ -s "$ANDROID_BUILD_DIR/$PROJECT_NAME-$VERSION_NAME.apk" ]; then
            log_success "Android APK is valid"
        else
            log_error "Android APK is empty or corrupted"
            return 1
        fi
    fi
    
    if [ -f "$ANDROID_BUILD_DIR/$PROJECT_NAME-$VERSION_NAME.aab" ]; then
        log_info "Validating Android App Bundle..."
        AAB_SIZE=$(du -h "$ANDROID_BUILD_DIR/$PROJECT_NAME-$VERSION_NAME.aab" | cut -f1)
        log_info "Android App Bundle size: $AAB_SIZE"
        
        if [ -s "$ANDROID_BUILD_DIR/$PROJECT_NAME-$VERSION_NAME.aab" ]; then
            log_success "Android App Bundle is valid"
        else
            log_error "Android App Bundle is empty or corrupted"
            return 1
        fi
    fi
    
    log_success "Build validation completed"
}

# Main function
main() {
    log_info "Starting production build for $PROJECT_NAME..."
    log_info "Version: $VERSION_NAME"
    log_info "Build Number: $BUILD_NUMBER"
    
    # Parse command line arguments
    SKIP_TESTS=false
    SKIP_IOS=false
    SKIP_ANDROID=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-ios)
                SKIP_IOS=true
                shift
                ;;
            --skip-android)
                SKIP_ANDROID=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --skip-tests     Skip running tests"
                echo "  --skip-ios       Skip iOS build"
                echo "  --skip-android   Skip Android build"
                echo "  --help           Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Execute build steps
    check_prerequisites
    install_dependencies
    clean_builds
    
    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    fi
    
    if [ "$SKIP_IOS" = false ]; then
        build_ios
    fi
    
    if [ "$SKIP_ANDROID" = false ]; then
        build_android
    fi
    
    generate_build_artifacts
    validate_builds
    
    log_success "🎉 Production build completed successfully!"
    log_info "Build artifacts are available in: $BUILD_DIR"
    log_info "Check build-summary.md for detailed information"
}

# Run main function
main "$@"
