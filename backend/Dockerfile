# Build stage
FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:24-bookworm-slim AS production

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled application code and database migrations
COPY --from=build /app/dist ./dist
COPY migrations ./migrations

# Security: run as non-root user
USER node

EXPOSE 4000

CMD ["node", "dist/server.js"]

