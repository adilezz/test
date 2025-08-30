# Deployment Guide - Theses.ma Frontend

## 🚀 Production Deployment

### Prerequisites
- Node.js 18+
- Web server (Nginx, Apache, or CDN)
- Backend API running and accessible

### Build Process

1. **Set environment variables:**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with production values
   ```

2. **Install dependencies:**
   ```bash
   npm ci --production
   ```

3. **Build the application:**
   ```bash
   npm run build
   ```

4. **The `dist` folder contains the built application**

### Environment Variables

```env
# Production API URL
VITE_API_BASE_URL=https://api.theses.ma/api

# App Configuration
VITE_APP_NAME="theses.ma"
VITE_APP_VERSION="1.0.0"

# Features
VITE_ENABLE_VOICE_SEARCH=true
VITE_ENABLE_ANALYTICS=true

# External Services
VITE_GOOGLE_ANALYTICS_ID=GA_TRACKING_ID
VITE_SENTRY_DSN=SENTRY_DSN_URL
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name theses.ma www.theses.ma;
    
    root /var/www/theses-ma/dist;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Docker Deployment

```dockerfile
# Multi-stage build
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Performance Optimization

1. **Code Splitting**: Already configured with React.lazy()
2. **Asset Optimization**: Vite handles minification and compression
3. **CDN**: Deploy static assets to CDN for better performance
4. **Caching**: Configure proper cache headers
5. **Monitoring**: Set up error tracking and analytics

### Security Headers

Add these headers to your web server configuration:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
```

### Health Checks

The application includes a health check endpoint at `/health` that returns:

```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

### Monitoring

Set up monitoring for:
- Application errors (Sentry)
- Performance metrics (Google Analytics)
- Uptime monitoring
- API response times
- User behavior analytics

### SSL Certificate

Use Let's Encrypt for free SSL certificates:

```bash
certbot --nginx -d theses.ma -d www.theses.ma
```

### Backup Strategy

1. **Database backups**: Regular automated backups
2. **File storage**: Backup uploaded PDF files
3. **Configuration**: Version control all configuration files
4. **Disaster recovery**: Document recovery procedures