FROM node:18-slim

# Install required dependencies for canvas and raknet-native
RUN apt-get update && \
    apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    fonts-liberation \
    cmake \
    && rm -rf /var/lib/apt/lists/*

# Set environment variable for raknet-native build
ENV FORCE_BUILD=true

# Set environment variable for production
ENV NODE_ENV=production

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Expose port
EXPOSE 8000

# Start the application
CMD [ "node", "index.js" ]