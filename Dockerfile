FROM library/node:slim

COPY . /app

RUN cd /app \
  && npm install --production

WORKDIR /app

EXPOSE 80

CMD ["npm", "start"]
