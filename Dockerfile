# Usa Node 20 Alpine — imagem leve com todas as ferramentas de compilação
FROM node:20-alpine

# Instala Python e ferramentas necessárias para compilar better-sqlite3
RUN apk add --no-cache python3 make gcc g++ musl-dev

WORKDIR /app

# Copia package.json primeiro (otimiza cache do Docker)
COPY package*.json ./

# Instala dependências (compila better-sqlite3 com as ferramentas acima)
RUN npm ci

# Copia o resto do código
COPY . .

# Faz o build do frontend e backend
RUN npm run build

# Porta que o Railway vai expor
EXPOSE 3000

# Variável de ambiente de produção
ENV NODE_ENV=production
ENV PORT=3000

# Cria pasta de dados para o banco SQLite
RUN mkdir -p /data

# Inicia o servidor
CMD ["npm", "run", "start"]
