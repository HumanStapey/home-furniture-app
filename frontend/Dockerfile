FROM node:22.23.3-alpine3.24 AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci --workspace @home-furniture/frontend --include-workspace-root
COPY frontend frontend
COPY packages/contracts packages/contracts
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace @home-furniture/frontend

FROM nginx:1.30.6-alpine3.24
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/out /usr/share/nginx/html
EXPOSE 80
