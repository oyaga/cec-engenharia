package db

import (
	"fmt"
	"io/fs"
	"sort"

	"github.com/PITICALYN/cec-backend/migrations"
	"gorm.io/gorm"
)

// RunMigrations aplica, em ordem, os arquivos .sql ainda não registrados na
// tabela schema_migrations. Cada arquivo roda dentro de uma transação.
func RunMigrations(gdb *gorm.DB) error {
	if err := gdb.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		version TEXT PRIMARY KEY,
		applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	)`).Error; err != nil {
		return fmt.Errorf("criar schema_migrations: %w", err)
	}

	entries, err := fs.Glob(migrations.Files, "*.sql")
	if err != nil {
		return err
	}
	sort.Strings(entries)

	for _, name := range entries {
		var count int64
		if err := gdb.Raw("SELECT COUNT(1) FROM schema_migrations WHERE version = ?", name).Scan(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			continue // já aplicada
		}

		sqlBytes, err := migrations.Files.ReadFile(name)
		if err != nil {
			return fmt.Errorf("ler %s: %w", name, err)
		}

		err = gdb.Transaction(func(tx *gorm.DB) error {
			if err := tx.Exec(string(sqlBytes)).Error; err != nil {
				return err
			}
			return tx.Exec("INSERT INTO schema_migrations (version) VALUES (?)", name).Error
		})
		if err != nil {
			return fmt.Errorf("aplicar %s: %w", name, err)
		}
		fmt.Printf("[migrate] aplicada: %s\n", name)
	}
	return nil
}
