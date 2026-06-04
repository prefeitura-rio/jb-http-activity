FROM node:20-alpine AS build
RUN apk add --no-cache yarn
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
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
EXPOSE 8080
ENV PORT=8080
USER node
CMD ["node", "server/index.js"]
