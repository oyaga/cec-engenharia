// Package settings gerencia system_settings. Segredos (ex.: asaas_api_key)
// NUNCA são devolvidos ao browser — corrige C1.
package settings

import (
	"net/http"

	"github.com/PITICALYN/cec-backend/internal/httpx"
	"github.com/PITICALYN/cec-backend/internal/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handler struct{ db *gorm.DB }

func NewHandler(db *gorm.DB) *Handler { return &Handler{db: db} }

// Chaves sensíveis: o valor nunca sai do servidor; devolvemos apenas um flag.
var sensitive = map[string]bool{
	"asaas_api_key":     true,
	"maria_ai_api_key":  true,
	"evolution_api_key": true,
}

// List: GET /settings (admin) — segredos mascarados.
func (h *Handler) List(c *gin.Context) {
	var all []models.SystemSetting
	h.db.Find(&all)

	out := make([]gin.H, 0, len(all))
	for _, s := range all {
		item := gin.H{"key": s.Key, "updated_at": s.UpdatedAt}
		if sensitive[s.Key] {
			item["value"] = ""
			item["is_set"] = s.Value != nil && *s.Value != ""
			item["sensitive"] = true
		} else {
			item["value"] = s.Value
		}
		out = append(out, item)
	}
	c.JSON(http.StatusOK, gin.H{"settings": out})
}

// Upsert: PUT /settings (admin) — grava um conjunto de chaves.
// Body: { "settings": { "chave": "valor", ... } }
func (h *Handler) Upsert(c *gin.Context) {
	var body struct {
		Settings map[string]string `json:"settings" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "corpo inválido")
		return
	}
	for k, v := range body.Settings {
		// Não sobrescreve segredo com string vazia (evita apagar sem querer).
		if sensitive[k] && v == "" {
			continue
		}
		val := v
		h.db.Save(&models.SystemSetting{Key: k, Value: &val})
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
