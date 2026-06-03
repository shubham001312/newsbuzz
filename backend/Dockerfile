FROM node:20-slim

ENV NODE_ENV=production

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ ./src/

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/health').then(r => {if(!r.ok) process.exit(1)})" || exit 1

# Start server
CMD ["node", "src/index.js"]
