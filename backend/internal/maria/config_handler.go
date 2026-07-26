package maria

import (
	"net/http"
	"strings"

	"github.com/PITICALYN/cec-backend/internal/httpx"
	"github.com/PITICALYN/cec-backend/internal/models"
	"github.com/gin-gonic/gin"
)

// GetConfig: GET /maria/config (admin/coordenador).
// Devolve a configuração efetiva da Maria. Segredos (chave de IA, chave da
// Evolution) NUNCA voltam ao browser — apenas um flag "*_set".
func (h *Handler) GetConfig(c *gin.Context) {
	s := loadSettings(h.db, h.cfg)
	c.JSON(http.StatusOK, gin.H{
		"enabled":           s.Enabled,
		"system_prompt":     s.SystemPrompt,
		"model":             s.Model,
		"provider":          s.Provider,
		"attendant":         s.Attendant,
		"handoff_keywords":  strings.Join(s.HandoffKeywords, "\n"),
		"evolution_url":     s.EvolutionURL,
		"ai_api_key_set":    s.APIKey != "",
		"evolution_key_set": s.EvolutionKey != "",
		"default_prompt":    systemPrompt, // para o botão "restaurar padrão"
	})
}

// PutConfig: PUT /maria/config (admin/coordenador).
// Grava as chaves em system_settings. Segredos vazios são ignorados (não apaga).
func (h *Handler) PutConfig(c *gin.Context) {
	var b struct {
		Enabled         *bool   `json:"enabled"`
		SystemPrompt    *string `json:"system_prompt"`
		Model           *string `json:"model"`
		Provider        *string `json:"provider"`
		Attendant       *string `json:"attendant"`
		HandoffKeywords *string `json:"handoff_keywords"`
		EvolutionURL    *string `json:"evolution_url"`
		AIAPIKey        *string `json:"ai_api_key"`
		EvolutionKey    *string `json:"evolution_key"`
	}
	if err := c.ShouldBindJSON(&b); err != nil {
		httpx.Error(c, http.StatusBadRequest, "corpo inválido")
		return
	}

	set := func(key, val string) {
		v := val
		h.db.Save(&models.SystemSetting{Key: key, Value: &v})
	}
	setSecret := func(key, val string) {
		if strings.TrimSpace(val) == "" {
			return // não sobrescreve segredo com vazio
		}
		set(key, val)
	}

	if b.Enabled != nil {
		if *b.Enabled {
			set(keyEnabled, "true")
		} else {
			set(keyEnabled, "false")
		}
	}
	if b.SystemPrompt != nil {
		set(keyPrompt, *b.SystemPrompt)
	}
	if b.Model != nil {
		set(keyModel, *b.Model)
	}
	if b.Provider != nil {
		set(keyProvider, *b.Provider)
	}
	if b.Attendant != nil {
		set(keyAttend, *b.Attendant)
	}
	if b.HandoffKeywords != nil {
		set(keyKeywords, *b.HandoffKeywords)
	}
	if b.EvolutionURL != nil {
		set(keyEvoURL, *b.EvolutionURL)
	}
	if b.AIAPIKey != nil {
		setSecret(keyAPIKey, *b.AIAPIKey)
	}
	if b.EvolutionKey != nil {
		setSecret(keyEvoKey, *b.EvolutionKey)
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}
