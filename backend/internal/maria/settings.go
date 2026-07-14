package maria

import (
	"strings"

	"github.com/PITICALYN/cec-backend/internal/config"
	"github.com/PITICALYN/cec-backend/internal/models"
	"gorm.io/gorm"
)

// Chaves de system_settings usadas pela Maria.
const (
	keyEnabled  = "maria_enabled"
	keyPrompt   = "maria_system_prompt"
	keyModel    = "maria_model"
	keyProvider = "maria_provider"
	keyAPIKey   = "maria_ai_api_key"
	keyAttend   = "maria_attendant"
	keyKeywords = "maria_handoff_keywords"
	keyEvoURL   = "evolution_api_url"
	keyEvoKey   = "evolution_api_key"
)

// Padrões usados quando a chave não está configurada no banco.
const (
	defaultModel    = "claude-haiku-4-5"
	defaultProvider = "anthropic"
)

var defaultHandoffKeywords = []string{
	"falar com humano", "falar com atendente", "atendente humano", "atendimento humano",
	"quero humano", "quero um atendente", "pessoa real", "falar com pessoa", "/humano",
	"preciso de um atendente", "falar com alguem", "falar com alguém",
}

// Settings é a configuração efetiva da Maria (banco > env > padrão).
type Settings struct {
	Enabled         bool
	SystemPrompt    string
	Model           string
	Provider        string
	APIKey          string
	Attendant       string
	HandoffKeywords []string
	EvolutionURL    string
	EvolutionKey    string
}

// loadSettings resolve a config efetiva: system_settings sobrepõe o .env, que
// sobrepõe os padrões embutidos.
func loadSettings(db *gorm.DB, cfg *config.Config) Settings {
	m := map[string]string{}
	var rows []models.SystemSetting
	db.Find(&rows)
	for _, r := range rows {
		if r.Value != nil {
			m[r.Key] = *r.Value
		}
	}
	get := func(k, fallback string) string {
		if v, ok := m[k]; ok && strings.TrimSpace(v) != "" {
			return v
		}
		return fallback
	}

	s := Settings{
		Enabled:      strings.ToLower(strings.TrimSpace(get(keyEnabled, "true"))) != "false",
		SystemPrompt: get(keyPrompt, systemPrompt),
		Model:        get(keyModel, defaultModel),
		Provider:     get(keyProvider, defaultProvider),
		APIKey:       get(keyAPIKey, cfg.AIAPIKey),
		Attendant:    get(keyAttend, cfg.MariaAttendant),
		EvolutionURL: get(keyEvoURL, cfg.EvolutionAPIURL),
		EvolutionKey: get(keyEvoKey, cfg.EvolutionAPIKey),
	}

	// palavras-chave de handoff: uma por linha ou separadas por vírgula.
	if raw, ok := m[keyKeywords]; ok && strings.TrimSpace(raw) != "" {
		var kws []string
		for _, part := range strings.FieldsFunc(raw, func(r rune) bool { return r == '\n' || r == ',' }) {
			if k := strings.ToLower(strings.TrimSpace(part)); k != "" {
				kws = append(kws, k)
			}
		}
		s.HandoffKeywords = kws
	} else {
		s.HandoffKeywords = defaultHandoffKeywords
	}
	return s
}
