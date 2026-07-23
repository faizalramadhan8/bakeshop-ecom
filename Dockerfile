FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
# Belum commit package-lock.json — pakai `npm install` (generate lock saat build).
# Kalau nanti lock committed, ganti ke `npm ci` untuk deterministic build.
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html/shop
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
