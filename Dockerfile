# =========================================================================
# GATO SaaS — imagem de produção (multi-stage)
# Stage 1: build dos estáticos do frontend (Vite)
# Stage 2: runtime com dependências de produção e execução via tsx
# =========================================================================

FROM node:22-alpine AS build
WORKDIR /app

# Instala dependências completas para o build do frontend
COPY package.json package-lock.json ./
RUN npm ci

# Copia todo o código e gera dist/ (frontend compilado pelo Vite)
COPY . .
RUN npm run build

# -------------------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Dependências de produção (incluindo tsx)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Artefatos do frontend gerados pelo Vite
COPY --from=build /app/dist ./dist

# Migrações SQL
COPY --from=build /app/db ./db

# Código-fonte necessário para a execução do server.ts
COPY --from=build /app/src ./src
COPY --from=build /app/server ./server
COPY --from=build /app/server.ts ./server.ts
COPY --from=build /app/tsconfig*.json ./

EXPOSE 3000
CMD ["npm", "start"]