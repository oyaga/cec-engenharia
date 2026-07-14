package config

import (
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

// Config guarda toda a configuração do processo, carregada do ambiente/.env.
type Config struct {
	AppEnv      string
	HTTPPort    string
	CORSOrigins []string
	DatabaseURL string
	RedisURL    string // vazio = cache desabilitado

	JWTSecret   string
	JWTTTLHours int

	SeedDev           bool
	SeedAdminEmail    string
	SeedAdminPassword string

	StorageDir string
	PublicURL  string
	WebDir     string // pasta do build do frontend (SPA); se setada, a API serve o site

	// Asaas (fallback; o valor efetivo pode vir de system_settings)
	AsaasAPIKey       string
	AsaasEnv          string
	AsaasWebhookToken string

	// Maria Antônia / WhatsApp
	EvolutionAPIURL string
	EvolutionAPIKey string
	AIProvider      string
	AIAPIKey        string
	MariaAttendant  string
}

// Load lê o .env (se existir) e monta a Config a partir das variáveis de ambiente.
func Load() *Config {
	// .env é opcional: em produção as variáveis vêm do ambiente.
	if err := godotenv.Load(); err != nil {
		log.Println("[config] nenhum .env carregado (ok em produção):", err)
	}

	c := &Config{
		AppEnv:            getEnv("APP_ENV", "development"),
		HTTPPort:          getEnv("HTTP_PORT", "8080"),
		CORSOrigins:       splitCSV(getEnv("CORS_ORIGINS", "http://localhost:5173")),
		DatabaseURL:       getEnv("DATABASE_URL", ""),
		RedisURL:          getEnv("REDIS_URL", ""),
		JWTSecret:         getEnv("JWT_SECRET", ""),
		JWTTTLHours:       getEnvInt("JWT_TTL_HOURS", 12),
		SeedDev:           getEnvBool("SEED_DEV", false),
		SeedAdminEmail:    getEnv("SEED_ADMIN_EMAIL", "admin@cec.local"),
		SeedAdminPassword: getEnv("SEED_ADMIN_PASSWORD", ""),
		StorageDir:        getEnv("STORAGE_DIR", "./uploads"),
		PublicURL:         getEnv("PUBLIC_URL", "http://localhost:8080"),
		WebDir:            getEnv("WEB_DIR", ""),
		AsaasAPIKey:       getEnv("ASAAS_API_KEY", ""),
		AsaasEnv:          getEnv("ASAAS_ENV", "sandbox"),
		AsaasWebhookToken: getEnv("ASAAS_WEBHOOK_TOKEN", ""),
		EvolutionAPIURL:   getEnv("EVOLUTION_API_URL", ""),
		EvolutionAPIKey:   getEnv("EVOLUTION_API_KEY", ""),
		AIProvider:        getEnv("AI_PROVIDER", ""),
		AIAPIKey:          getEnv("AI_API_KEY", ""),
		MariaAttendant:    getEnv("MARIA_ATTENDANT", ""),
	}

	if c.DatabaseURL == "" {
		log.Fatal("[config] DATABASE_URL é obrigatório")
	}
	if c.JWTSecret == "" || c.JWTSecret == "troque-este-segredo-em-producao" {
		if c.AppEnv == "production" {
			log.Fatal("[config] JWT_SECRET inseguro/ausente em produção")
		}
		log.Println("[config] AVISO: JWT_SECRET fraco — ok só em desenvolvimento")
	}
	return c
}

func (c *Config) IsProd() bool { return c.AppEnv == "production" }

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getEnvInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

func getEnvBool(key string, def bool) bool {
	if v := os.Getenv(key); v != "" {
		return strings.EqualFold(v, "true") || v == "1"
	}
	return def
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
