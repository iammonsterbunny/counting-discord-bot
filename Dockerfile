FROM node:18-slim

# Install required system dependencies
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
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files and clear npm cache
COPY package*.json ./
RUN npm cache clean --force

# Install dependencies without target_platform
RUN npm install --build-from-source

# Copy application source code
COPY . .

# Expose port (optional, based on your app's configuration)
EXPOSE 8000

# Start the application
CMD [ "node", "index.js" ]
