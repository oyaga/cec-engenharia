// Package cache implementa cache de respostas em Redis para os endpoints
// públicos de leitura (site, catálogo). Se REDIS_URL não estiver configurada
// ou o Redis cair, a API segue funcionando sem cache (fail-open).
package cache

import (
	"bytes"
	"context"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

type Cache struct {
	rdb *redis.Client
}

// New cria o cache a partir da REDIS_URL. URL vazia = cache desabilitado.
func New(redisURL string) *Cache {
	if redisURL == "" {
		log.Println("[cache] REDIS_URL ausente — cache desabilitado")
		return &Cache{}
	}
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Printf("[cache] REDIS_URL inválida (%v) — cache desabilitado", err)
		return &Cache{}
	}
	rdb := redis.NewClient(opt)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := rdb.Ping(ctx).Err(); err != nil {
		// Não aborta: o Redis pode subir depois do api no compose.
		log.Printf("[cache] Redis indisponível no arranque (%v) — seguirá tentando", err)
	}
	return &Cache{rdb: rdb}
}

func (c *Cache) Enabled() bool { return c != nil && c.rdb != nil }

// Ping para o healthcheck.
func (c *Cache) Ping(ctx context.Context) error {
	if !c.Enabled() {
		return redis.ErrClosed
	}
	return c.rdb.Ping(ctx).Err()
}

// Page é um middleware que serve a resposta do Redis quando houver hit e,
// no miss, captura a resposta 200 do handler e a armazena com o TTL dado.
// Uso apenas em rotas GET públicas (a chave é fixa, sem variação por usuário).
func (c *Cache) Page(key string, ttl time.Duration) gin.HandlerFunc {
	return func(g *gin.Context) {
		if !c.Enabled() || g.Request.Method != http.MethodGet {
			g.Next()
			return
		}
		if b, err := c.rdb.Get(g.Request.Context(), key).Bytes(); err == nil {
			g.Header("X-Cache", "HIT")
			g.Data(http.StatusOK, "application/json; charset=utf-8", b)
			g.Abort()
			return
		}
		w := &bodyCapture{ResponseWriter: g.Writer}
		g.Writer = w
		g.Header("X-Cache", "MISS")
		g.Next()
		if w.Status() == http.StatusOK && w.buf.Len() > 0 {
			// Contexto próprio: o do request pode já ter sido cancelado.
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			if err := c.rdb.Set(ctx, key, w.buf.Bytes(), ttl).Err(); err != nil {
				log.Printf("[cache] falha ao gravar %s: %v", key, err)
			}
		}
	}
}

// InvalidateOn deleta as chaves após uma escrita bem-sucedida (2xx/3xx).
func (c *Cache) InvalidateOn(keys ...string) gin.HandlerFunc {
	return func(g *gin.Context) {
		g.Next()
		if !c.Enabled() || len(keys) == 0 {
			return
		}
		if s := g.Writer.Status(); s >= 200 && s < 400 {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			if err := c.rdb.Del(ctx, keys...).Err(); err != nil {
				log.Printf("[cache] falha ao invalidar %v: %v", keys, err)
			}
		}
	}
}

// bodyCapture duplica o corpo escrito pelo handler para podermos armazená-lo.
type bodyCapture struct {
	gin.ResponseWriter
	buf bytes.Buffer
}

func (w *bodyCapture) Write(b []byte) (int, error) {
	w.buf.Write(b)
	return w.ResponseWriter.Write(b)
}

func (w *bodyCapture) WriteString(s string) (int, error) {
	w.buf.WriteString(s)
	return w.ResponseWriter.WriteString(s)
}
