package main

import (
	"log"

	"github.com/PITICALYN/cec-backend/internal/auth"
	"github.com/PITICALYN/cec-backend/internal/config"
	"github.com/PITICALYN/cec-backend/internal/db"
	"github.com/PITICALYN/cec-backend/internal/router"
	"github.com/PITICALYN/cec-backend/internal/seed"
)

func main() {
	cfg := config.Load()

	gdb, err := db.Open(cfg.DatabaseURL, cfg.IsProd())
	if err != nil {
		log.Fatalf("[main] falha ao conectar no banco: %v", err)
	}

	if err := db.RunMigrations(gdb); err != nil {
		log.Fatalf("[main] falha nas migrations: %v", err)
	}

	if err := seed.DevAdmin(gdb, cfg); err != nil {
		log.Fatalf("[main] falha no seed: %v", err)
	}

	tm := auth.NewTokenManager(cfg.JWTSecret, cfg.JWTTTLHours)
	r := router.New(cfg, gdb, tm)

	addr := ":" + cfg.HTTPPort
	log.Printf("[main] API ouvindo em %s (env=%s)", addr, cfg.AppEnv)
	if err := r.Run(addr); err != nil {
		log.Fatalf("[main] servidor encerrou: %v", err)
	}
}
