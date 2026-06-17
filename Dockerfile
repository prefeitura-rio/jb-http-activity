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
COPY public/ ./public/
ARG SFMC_ACTIVITY_KEY
RUN if [ -n "$SFMC_ACTIVITY_KEY" ]; then sed -i "s/SUBSTITUIR_PELA_ACTIVITY_KEY/$SFMC_ACTIVITY_KEY/g" public/config.json; fi
EXPOSE 8080
ENV PORT=8080
USER node
CMD ["node", "server/index.js"]
