# =========================================================================
# GATO SaaS — imagem de produção (multi-stage)
# Stage 1: build do frontend (Vite) + bundle do servidor (esbuild).
# Stage 2: runtime enxuto com apenas dependências de produção.
# =========================================================================

FROM node:22-alpine AS build
WORKDIR /app

# Instala dependências (cache em camada separada)
COPY package.json package-lock.json ./
RUN npm ci

# Copia o código e gera dist/ (frontend + dist/server.cjs)
COPY . .
RUN npm run build

# -------------------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Apenas dependências de runtime (pg, express, dotenv, supabase-js, ...)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Artefatos de build (index.html, assets e server.cjs)
COPY --from=build /app/dist ./dist

# Migrações SQL (aplicadas pelo runner no boot / npm run migrate)
COPY --from=build /app/db ./db

EXPOSE 3000
CMD ["node", "dist/server.cjs"]
