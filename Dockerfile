# Etapa 1: Build (Gerar os arquivos estáticos de produção)
FROM node:18-alpine as build
WORKDIR /app

# Copia e instala as dependências
COPY package*.json ./
RUN npm install

# Copia o código fonte e as imagens
COPY . .

# Compila o app Vite para a pasta /dist
RUN npm run build

# Etapa 2: Servidor Web Leve (Nginx) para as rotas funcionarem
FROM nginx:alpine

# Copiar a build final do React pro servidor
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar nosso arquivo customizado que permite usar o React-router
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Abrir porta
EXPOSE 80

# Iniciar o servidor
CMD ["nginx", "-g", "daemon off;"]
