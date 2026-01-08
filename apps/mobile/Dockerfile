# Mobile app is an Expo/React Native app
# This should NOT be deployed on Railway
# Mobile apps should be built using EAS Build and deployed to app stores
#
# If you see this Dockerfile being used, please remove the mobile service from Railway
# and build the mobile app using: eas build --platform android/ios

FROM node:20-alpine

WORKDIR /app

RUN echo "❌ ERROR: Mobile app should not be deployed on Railway" && \
    echo "Mobile apps are React Native/Expo apps that should be built using EAS Build" && \
    echo "and deployed to Google Play Store and Apple App Store." && \
    echo "" && \
    echo "To build the mobile app:" && \
    echo "  cd apps/mobile" && \
    echo "  eas build --platform android" && \
    echo "  eas build --platform ios" && \
    exit 1

CMD ["echo", "This service should not be running"]
