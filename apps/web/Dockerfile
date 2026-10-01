FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

RUN npm install
RUN npm run build --workspace=@vetvision/shared-types
RUN npm run build --workspace=@vetvision/validation
RUN npm run build --workspace=@vetvision/web

FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Custom nginx config to support client-side routing
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
