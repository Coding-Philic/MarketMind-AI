FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Don't copy .env into image — pass via docker-compose or runtime env
# Required env vars: GROQ_API_KEY, TAVILY_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, PORT

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["npm", "start"]
