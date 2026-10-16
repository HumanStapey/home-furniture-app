FROM node:22.23.3-alpine3.24 AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci --workspace @home-furniture/backend --include-workspace-root
COPY backend backend
COPY packages/contracts packages/contracts
RUN npm run build --workspace @home-furniture/backend

FROM node:22.23.3-alpine3.24
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci --omit=dev --workspace @home-furniture/backend --include-workspace-root && npm cache clean --force
COPY --from=build /app/backend/dist backend/dist
WORKDIR /app/backend
USER node
EXPOSE 3001
CMD ["sh", "-c", "node ../node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js && exec node dist/main.js"]
