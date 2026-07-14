package db

import (
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Open abre a conexão GORM com o Postgres.
func Open(dsn string, prod bool) (*gorm.DB, error) {
	logLevel := logger.Info
	if prod {
		logLevel = logger.Warn
	}
	return gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
}
