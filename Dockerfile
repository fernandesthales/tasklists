# Build React with development dependencies.
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY api/package.json api/package.json
COPY web/package.json web/package.json
RUN npm ci
COPY web web
RUN npm run build

# The final image serves both the API and compiled React files.
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
COPY api/package.json api/package.json
COPY web/package.json web/package.json
RUN npm ci --omit=dev && npm cache clean --force
COPY api api
COPY --from=build /app/web/dist web/dist
USER node
EXPOSE 3000
CMD ["node", "api/server.js"]
