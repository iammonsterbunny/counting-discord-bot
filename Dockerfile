FROM node:18-slim

# Install required dependencies including cmake
RUN apt-get update && \
    apt-get install -y \
    build-essential \
    python3 \
    cmake \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./

# Install with specific platform target and build from source
RUN npm install --target_platform=linux --build-from-source

# Copy source
COPY . .

# Expose port
EXPOSE 8000

# Start the application
CMD [ "node", "index.js" ]