package middleware

import (
	"net/http"
	"strings"

	"github.com/PITICALYN/cec-backend/internal/auth"
	"github.com/PITICALYN/cec-backend/internal/httpx"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	ctxUserID = "userID"
	ctxRole   = "role"
)

// RequireAuth valida o Bearer JWT e injeta userID/role no contexto.
func RequireAuth(tm *auth.TokenManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			httpx.Error(c, http.StatusUnauthorized, "token ausente")
			return
		}
		claims, err := tm.Parse(strings.TrimPrefix(header, "Bearer "))
		if err != nil {
			httpx.Error(c, http.StatusUnauthorized, "token inválido ou expirado")
			return
		}
		c.Set(ctxUserID, claims.UserID)
		c.Set(ctxRole, claims.Role)
		c.Next()
	}
}

// RequireRole restringe a rota aos papéis informados.
func RequireRole(roles ...string) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(roles))
	for _, r := range roles {
		allowed[r] = struct{}{}
	}
	return func(c *gin.Context) {
		role, _ := c.Get(ctxRole)
		if roleStr, ok := role.(string); ok {
			if _, permitted := allowed[roleStr]; permitted {
				c.Next()
				return
			}
		}
		httpx.Error(c, http.StatusForbidden, "acesso negado para este papel")
	}
}

// UserID recupera o id do usuário autenticado do contexto.
func UserID(c *gin.Context) uuid.UUID {
	if v, ok := c.Get(ctxUserID); ok {
		if id, ok := v.(uuid.UUID); ok {
			return id
		}
	}
	return uuid.Nil
}

// Role recupera o papel do usuário autenticado do contexto.
func Role(c *gin.Context) string {
	if v, ok := c.Get(ctxRole); ok {
		if r, ok := v.(string); ok {
			return r
		}
	}
	return ""
}
