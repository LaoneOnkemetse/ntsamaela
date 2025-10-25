FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/web-admin/package*.json ./apps/web-admin/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN cd apps/web-admin && npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]













