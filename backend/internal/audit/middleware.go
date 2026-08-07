package audit

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/PITICALYN/cec-backend/internal/middleware"
	"github.com/PITICALYN/cec-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// MutationLogger registra automaticamente as mutações feitas por usuários
// internos. Ele roda depois do handler para guardar apenas operações que
// realmente foram aceitas pela API (status 2xx/3xx).
func MutationLogger(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		method := c.Request.Method
		if method == http.MethodGet || method == http.MethodHead || method == http.MethodOptions {
			c.Next()
			return
		}

		c.Next()
		if c.Writer.Status() >= http.StatusBadRequest || strings.HasPrefix(c.Request.URL.Path, "/api/v1/audit") {
			return
		}

		uid := middleware.UserID(c)
		role := middleware.Role(c)
		if uid == uuid.Nil || !auditedRole(role) {
			return
		}

		entityType := entityFromPath(c.Request.URL.Path)
		entityID := entityIDFromParams(c)
		details, _ := json.Marshal(gin.H{
			"method": method,
			"path":   c.Request.URL.Path,
			"status": c.Writer.Status(),
			"role":   role,
		})
		ip := c.ClientIP()
		entry := models.AuditLog{
			ID:         uuid.New(),
			UserID:     &uid,
			Action:     actionFor(method, c.Request.URL.Path),
			EntityType: entityType,
			EntityID:   entityID,
			Details:    datatypes.JSON(details),
			IP:         &ip,
		}
		// Auditoria não pode transformar uma operação bem-sucedida em erro.
		_ = db.Create(&entry).Error
	}
}

func auditedRole(role string) bool {
	switch role {
	case "admin", "coordenador", "atendente", "instrutor", "webdesigner", "financeiro", "administrativo":
		return true
	}
	return false
}

func actionFor(method, path string) string {
	switch {
	case strings.Contains(path, "/certificates"):
		return "EMISSAO_CERTIFICADO"
	case strings.Contains(path, "/doubts/") && method == http.MethodPut:
		return "RESPOSTA_DUVIDA"
	case strings.Contains(path, "/messages") && method == http.MethodPost:
		return "ENVIO_MENSAGEM"
	case strings.Contains(path, "/review-doc"):
		return "REVISAO_DOCUMENTO"
	case strings.Contains(path, "/attendance"):
		return "REGISTRO_FREQUENCIA"
	case strings.Contains(path, "/reset-password"):
		return "REDEFINICAO_SENHA"
	case method == http.MethodPost:
		return "CRIACAO"
	case method == http.MethodPut || method == http.MethodPatch:
		return "ATUALIZACAO"
	case method == http.MethodDelete:
		return "EXCLUSAO"
	default:
		return "ALTERACAO"
	}
}

func entityFromPath(path string) string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	for i, part := range parts {
		if part == "v1" && i+1 < len(parts) {
			return parts[i+1]
		}
	}
	return "sistema"
}

func entityIDFromParams(c *gin.Context) *uuid.UUID {
	for _, key := range []string{"id", "studentId", "moduleId", "linkId"} {
		if value := c.Param(key); value != "" {
			if parsed, err := uuid.Parse(value); err == nil {
				return &parsed
			}
		}
	}
	return nil
}
