FROM node:12-alpine as builder

ARG REACT_APP_SERVICES_HOST=/services/m

WORKDIR /web
COPY package.json /web/package.json
COPY package-lock.json /web/package-lock.json
COPY nginx.conf /etc/nginx/nginx.conf
RUN npm install --only=prod
COPY . /web/
RUN npm run build

FROM nginx:latest
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /web/build /usr/share/nginx/html
CMD ["/usr/sbin/nginx", "-g", "daemon off;"]
