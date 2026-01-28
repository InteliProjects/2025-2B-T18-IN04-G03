FROM node:18

WORKDIR /usr/src/app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências
RUN npm ci

COPY . .

# Expõe a porta 3001 onde o Express vai rodar
EXPOSE 3001


CMD ["node", "app.js"]
