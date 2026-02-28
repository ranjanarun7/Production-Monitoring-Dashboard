FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY src ./src
COPY public ./public

ARG REACT_APP_API_URL=http://localhost:5000/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

FROM node:18-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/build ./build

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

CMD ["serve", "-s", "build", "-l", "3000"]
