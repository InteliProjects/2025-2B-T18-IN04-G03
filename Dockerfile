# syntax=docker/dockerfile:1
ARG NODE_VERSION=22.15.0
FROM node:${NODE_VERSION}-alpine

ENV NODE_ENV=production

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY . .

CMD ["node", "src/microsservico/brokerSubscribe.js"]

