FROM node:20-slim

RUN apt-get update \
     && apt-get install -y wget --no-install-recommends \
     && apt-get install -y gnupg gnupg1 gnupg2

RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'

RUN apt-get update \
     && apt-get install -y libxext6:amd64 google-chrome-stable --no-install-recommends

RUN rm -rf /var/lib/apt/lists/*

COPY . .

RUN npm install --prefer-offline && npm run build

ARG PORT=3000

ENV PORT=$PORT

CMD npm run start