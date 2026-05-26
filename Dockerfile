FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY server/ ./server/
COPY public/ ./public/

EXPOSE 8080
ENV PORT=8080

CMD ["node", "server/index.js"]
