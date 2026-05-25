# Stage 1: Compile React + TS static assets using Node
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve compiled build using Nginx reverse proxy
FROM nginx:stable-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
