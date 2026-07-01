FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
ARG VITE_BASE_PATH
ENV VITE_BASE_PATH=$VITE_BASE_PATH
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server/ ./server/
ARG SFMC_ACTIVITY_KEY
ARG SFMC_ACTIVITY_NAME
ARG SFMC_BASE_URL
COPY public/ ./public/
RUN if [ -n "$SFMC_ACTIVITY_KEY" ]; then \
      sed -i "s/SUBSTITUIR_PELA_ACTIVITY_KEY/$SFMC_ACTIVITY_KEY/g" public/config.json && \
      sed -i "s/SUBSTITUIR_PELA_ACTIVITY_KEY/$SFMC_ACTIVITY_KEY/g" dist/config.json; \
    fi && \
    if [ -n "$SFMC_ACTIVITY_NAME" ]; then \
      sed -i "s/SUBSTITUIR_PELO_NOME/$SFMC_ACTIVITY_NAME/g" public/config.json && \
      sed -i "s/SUBSTITUIR_PELO_NOME/$SFMC_ACTIVITY_NAME/g" dist/config.json; \
    fi && \
    if [ -n "$SFMC_BASE_URL" ]; then \
      sed -i "s|SUBSTITUIR_PELA_URL_BASE|$SFMC_BASE_URL|g" public/config.json && \
      sed -i "s|SUBSTITUIR_PELA_URL_BASE|$SFMC_BASE_URL|g" dist/config.json; \
    fi
EXPOSE 8080
ENV PORT=8080
USER node
CMD ["node", "server/index.js"]
