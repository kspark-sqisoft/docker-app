FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# Windows 등에서 생성한 lock 과 Linux npm ci 가 어긋날 때가 있어 install 사용 (공부/로컬 혼합 환경용)
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
