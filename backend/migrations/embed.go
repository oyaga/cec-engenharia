// Package migrations embute os arquivos .sql para serem aplicados pelo runner.
package migrations

import "embed"

//go:embed *.sql
var Files embed.FS
