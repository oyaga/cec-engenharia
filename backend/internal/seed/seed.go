// Package seed cria dados iniciais de desenvolvimento.
package seed

import (
	"log"
	"strings"

	"github.com/PITICALYN/cec-backend/internal/auth"
	"github.com/PITICALYN/cec-backend/internal/config"
	"github.com/PITICALYN/cec-backend/internal/models"
	"gorm.io/gorm"
)

// DevAdmin cria um admin inicial se o banco não tiver nenhum usuário.
// Só roda quando SEED_DEV=true e nunca sobrescreve dados existentes.
func DevAdmin(gdb *gorm.DB, cfg *config.Config) error {
	if !cfg.SeedDev {
		return nil
	}
	if cfg.SeedAdminPassword == "" {
		log.Println("[seed] SEED_DEV=true mas SEED_ADMIN_PASSWORD vazio — pulando")
		return nil
	}

	var count int64
	if err := gdb.Model(&models.User{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil // já há usuários — não semear
	}

	hash, err := auth.HashPassword(cfg.SeedAdminPassword)
	if err != nil {
		return err
	}
	admin := models.User{
		Email:              strings.ToLower(cfg.SeedAdminEmail),
		PasswordHash:       hash,
		FullName:           "Administrador CEC",
		Role:               "admin",
		IsActive:           true,
		MustChangePassword: true, // força troca no primeiro login
	}
	if err := gdb.Create(&admin).Error; err != nil {
		return err
	}
	log.Printf("[seed] admin de desenvolvimento criado: %s (troca de senha obrigatória)\n", admin.Email)
	return nil
}
