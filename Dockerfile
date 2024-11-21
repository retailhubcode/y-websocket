FROM public.ecr.aws/docker/library/node:18.20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 1234

CMD ["npm", "run", "start"]
