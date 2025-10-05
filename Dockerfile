FROM node:18-slim

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY server.js ./
COPY public ./public
COPY config ./config
COPY models ./models
COPY routes ./routes
COPY terms ./terms
COPY utils ./utils
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.js"]