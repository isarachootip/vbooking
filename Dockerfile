# Stage 1: Build the React client app
FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Production runtime environment
FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

# Copy build artifacts and runtime server files
COPY --from=builder /app/dist ./dist
COPY server.js ./
COPY mailService.js ./
COPY src/ ./src/
COPY user_manual.md ./

# Ensure uploads directory exists
RUN mkdir -p uploads

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
