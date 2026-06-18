FROM node:20-alpine AS build
RUN apk add --no-cache yarn
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
ARG VITE_BASE_PATH
ENV VITE_BASE_PATH=$VITE_BASE_PATH
COPY . .
RUN yarn build

FROM node:20-alpine
RUN apk add --no-cache yarn
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production
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
