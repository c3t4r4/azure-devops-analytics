FROM node:24-alpine AS build
WORKDIR /app

RUN npm install -g @angular/cli@latest

COPY package*.json ./
RUN npm ci

COPY . .
RUN ng build --configuration production

FROM nginx:alpine AS runtime
COPY --from=build /app/dist/dashboard-devops/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:80 || exit 1
