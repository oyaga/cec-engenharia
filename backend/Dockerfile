# ─── Build ───────────────────────────────────────────
FROM golang:1.25-alpine AS build
WORKDIR /src

# Cache de dependências
COPY go.mod go.sum ./
RUN go mod download

# Código + build estático (migrations são embutidas via go:embed)
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/cec-api ./cmd/api

# ─── Runtime (imagem mínima) ─────────────────────────
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata && adduser -D -u 10001 app
WORKDIR /app
# Cria uploads e dá posse ao usuário app ANTES do volume montar
# (o volume nomeado herda a dona no primeiro mount).
RUN mkdir -p /app/uploads && chown -R app:app /app
COPY --from=build --chown=app:app /out/cec-api /app/cec-api
USER app
EXPOSE 8080
ENTRYPOINT ["/app/cec-api"]
