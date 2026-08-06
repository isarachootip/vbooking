# Stage 1: Build the React client app
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY . .
RUN npm run build

# Stage 2: Production runtime environment
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

# Copy build artifacts and runtime server files
COPY --from=builder /app/dist ./dist
COPY server.js ./
COPY mailService.js ./

# Ensure uploads directory exists
RUN mkdir -p uploads

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
