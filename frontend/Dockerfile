# Stage 1: Building the Next.js application
FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies (needed for compiling some native node modules if any)
RUN apk add --no-cache libc6-compat

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies (including devDependencies for building)
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Set build-time argument for API URL (Next.js bakes NEXT_PUBLIC_* envs into client JS during build)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_GROQ_API_KEY
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:8001/api/v1}
ENV NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY}
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID}
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}
ENV NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID}
ENV NEXT_PUBLIC_GROQ_API_KEY=${NEXT_PUBLIC_GROQ_API_KEY}

# Build the Next.js production bundle
RUN npm run build

# Stage 2: Production runner environment
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production \
    PORT=3000

# Install only production dependencies to keep the image size minimal
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy built assets and Next.js internal configurations from builder
COPY --from=builder /app/.next /app/.next
COPY --from=builder /app/public /app/public
COPY --from=builder /app/next.config.js /app/next.config.js

# Expose Next.js production port
EXPOSE 3000

# Start the Next.js server in production mode.
# Pin the port explicitly instead of `npm run start` — upstream's package.json
# start script hardcodes `-p 5012`, which would override $PORT and break the
# 3000 mapping that compose/Traefik expect. Bind to 3000 directly.
CMD ["./node_modules/.bin/next", "start", "-p", "3000"]
