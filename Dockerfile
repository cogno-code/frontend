# 1단계: Vite 빌드
FROM node:20-alpine AS builder
WORKDIR /app

# 패키지 설치
COPY package.json package-lock.json* ./
RUN npm ci

# 소스 복사 및 빌드
COPY . .
RUN npm run build

# 2단계: Nginx로 정적 파일 서빙
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

# 기본 파일 제거
RUN rm -rf ./*

# Vite 빌드 결과 복사
COPY --from=builder /app/dist ./

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
