## Multi-stage Dockerfile: build with Node, serve with Nginx

FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile || yarn install

# Copy source and build
COPY . .
RUN yarn build

FROM nginx:alpine AS runtime

# Copy built static files
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx config for SPA fallback and basic optimizations
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


