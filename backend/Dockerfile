FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 5000
CMD ["sh", "-c", "node src/seed/seed.js && node src/server.js"]
