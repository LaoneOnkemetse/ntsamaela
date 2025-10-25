# Ntsamaela Project Makefile

.PHONY: help install dev build test clean docker-up docker-down docker-build

# Default target
help: ## Show this help message
	@echo "Ntsamaela Project Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Installation
install: ## Install all dependencies
	@echo "Installing root dependencies..."
	npm install
	@echo "Installing API dependencies..."
	cd apps/api && npm install
	@echo "Installing mobile app dependencies..."
	cd apps/mobile && npm install
	@echo "Installing admin dashboard dependencies..."
	cd apps/web-admin && npm install
	@echo "Installing shared package dependencies..."
	cd packages/shared && npm install
	@echo "Installing database package dependencies..."
	cd packages/database && npm install

# Development
dev: ## Start all development servers
	@echo "Starting development servers..."
	npm run dev

dev-api: ## Start API development server
	@echo "Starting API development server..."
	cd apps/api && npm run dev

dev-mobile: ## Start mobile app development server
	@echo "Starting mobile app development server..."
	cd apps/mobile && npm start

dev-admin: ## Start admin dashboard development server
	@echo "Starting admin dashboard development server..."
	cd apps/web-admin && npm run dev

# Building
build: ## Build all applications
	@echo "Building all applications..."
	npm run build

build-api: ## Build API
	@echo "Building API..."
	cd apps/api && npm run build

build-mobile: ## Build mobile app
	@echo "Building mobile app..."
	cd apps/mobile && npm run build

build-admin: ## Build admin dashboard
	@echo "Building admin dashboard..."
	cd apps/web-admin && npm run build

# Testing
test: ## Run all tests
	@echo "Running all tests..."
	npm test

test-unit: ## Run unit tests
	@echo "Running unit tests..."
	npm run test:unit

test-integration: ## Run integration tests
	@echo "Running integration tests..."
	npm run test:integration

test-e2e: ## Run E2E tests
	@echo "Running E2E tests..."
	npm run test:e2e

test-coverage: ## Run tests with coverage
	@echo "Running tests with coverage..."
	npm run test:coverage

# Database
db-generate: ## Generate Prisma client
	@echo "Generating Prisma client..."
	npm run db:generate

db-push: ## Push database schema
	@echo "Pushing database schema..."
	npm run db:push

db-migrate: ## Run database migrations
	@echo "Running database migrations..."
	npm run db:migrate

db-seed: ## Seed database
	@echo "Seeding database..."
	npm run db:seed

db-studio: ## Open Prisma Studio
	@echo "Opening Prisma Studio..."
	npm run db:studio

db-reset: ## Reset database
	@echo "Resetting database..."
	cd packages/database && npx prisma migrate reset

# Code Quality
lint: ## Run linting
	@echo "Running linting..."
	npm run lint

lint-fix: ## Fix linting issues
	@echo "Fixing linting issues..."
	npm run lint:fix

type-check: ## Run type checking
	@echo "Running type checking..."
	npm run type-check

format: ## Format code
	@echo "Formatting code..."
	npx prettier --write .

# Docker
docker-up: ## Start Docker containers
	@echo "Starting Docker containers..."
	docker-compose up -d

docker-down: ## Stop Docker containers
	@echo "Stopping Docker containers..."
	docker-compose down

docker-build: ## Build Docker images
	@echo "Building Docker images..."
	docker-compose build

docker-logs: ## View Docker logs
	@echo "Viewing Docker logs..."
	docker-compose logs -f

docker-clean: ## Clean Docker containers and images
	@echo "Cleaning Docker containers and images..."
	docker-compose down -v
	docker system prune -f

# Setup
setup: install db-generate ## Complete project setup
	@echo "Project setup complete!"
	@echo "Run 'make dev' to start development servers"

setup-docker: docker-build docker-up ## Setup with Docker
	@echo "Docker setup complete!"
	@echo "Services are running on:"
	@echo "  API: http://localhost:3000"
	@echo "  Admin: http://localhost:3001"
	@echo "  Mobile: http://localhost:19000"

# Cleanup
clean: ## Clean build artifacts and dependencies
	@echo "Cleaning build artifacts..."
	rm -rf node_modules
	rm -rf apps/*/node_modules
	rm -rf packages/*/node_modules
	rm -rf apps/*/dist
	rm -rf apps/*/build
	rm -rf apps/*/.next
	rm -rf coverage
	rm -rf .nyc_output

# Production
prod-build: ## Build for production
	@echo "Building for production..."
	NODE_ENV=production npm run build

prod-start: ## Start production servers
	@echo "Starting production servers..."
	NODE_ENV=production npm start

# Utilities
logs: ## View application logs
	@echo "Viewing application logs..."
	tail -f apps/api/logs/combined.log

status: ## Check service status
	@echo "Checking service status..."
	@echo "API: $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/health || echo 'DOWN')"
	@echo "Admin: $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001 || echo 'DOWN')"
	@echo "Mobile: $$(curl -s -o /dev/null -w '%{http_code}' http://localhost:19000 || echo 'DOWN')"

# Security
audit: ## Run security audit
	@echo "Running security audit..."
	npm audit

audit-fix: ## Fix security vulnerabilities
	@echo "Fixing security vulnerabilities..."
	npm audit fix

# Documentation
docs: ## Generate documentation
	@echo "Generating documentation..."
	npm run docs:generate

# Release
release: ## Create a new release
	@echo "Creating new release..."
	npm version patch
	git push --tags













