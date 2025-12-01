# 1단계: 빌드
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# 2단계: nginx
FROM nginx:1.27-alpine

# ✅ 우리가 만든 nginx.conf를 기본 설정으로 사용
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ✅ webroot for certbot
RUN mkdir -p /var/www/certbot

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*

COPY --from=builder /app/dist ./

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
