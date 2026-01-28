# Stage 1: Build the React Frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Setup the Production Server
FROM node:20-alpine AS runner
WORKDIR /app

# Copy package.json to install ONLY production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the built frontend from Stage 1
COPY --from=builder /app/dist ./dist

# Copy the server code
COPY server ./server

# Expose port 3000 (where our server runs)
EXPOSE 3000

# Start the server
CMD ["node", "server/index.js"]
