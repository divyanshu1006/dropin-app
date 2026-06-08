# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first for caching
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build frontend and backend
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy built files and dependencies
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json package-lock.json* ./
RUN npm ci --omit=dev

# Expose port (can be overridden by process.env.PORT)
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]
