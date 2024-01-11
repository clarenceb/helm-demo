FROM node:14
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
ENV MY_POD_NAMESPACE=default
ENV JOKE_CATEGORY=dev
ENV BG_COLOR=bg-light
CMD [ "node", "app.js" ]
