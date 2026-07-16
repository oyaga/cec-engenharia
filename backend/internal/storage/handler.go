// Package storage implementa upload/serviço de arquivos em disco local
// (substitui o Supabase Storage). Em produção, trocar por S3-compatível.
package storage

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/PITICALYN/cec-backend/internal/httpx"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	dir       string
	publicURL string
}

func NewHandler(dir, publicURL string) *Handler {
	_ = os.MkdirAll(dir, 0o755)
	return &Handler{dir: dir, publicURL: publicURL}
}

var allowedExt = map[string]bool{
	".pdf": true, ".png": true, ".jpg": true, ".jpeg": true, ".webp": true, ".gif": true,
}

// Vídeos das aulas (LMS) têm limite próprio, maior que o de documentos.
var videoExt = map[string]bool{
	".mp4": true, ".webm": true,
}

const (
	maxDocSize   = 20 << 20  // 20 MB
	maxVideoSize = 500 << 20 // 500 MB
)

// Upload: POST /files (multipart; campo "file", opcional "folder").
func (h *Handler) Upload(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		httpx.Error(c, http.StatusBadRequest, "arquivo é obrigatório (campo 'file')")
		return
	}
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !allowedExt[ext] && !videoExt[ext] {
		httpx.Error(c, http.StatusBadRequest, "tipo de arquivo não permitido")
		return
	}
	if videoExt[ext] && file.Size > maxVideoSize {
		httpx.Error(c, http.StatusBadRequest, "vídeo excede 500 MB")
		return
	}
	if allowedExt[ext] && file.Size > maxDocSize {
		httpx.Error(c, http.StatusBadRequest, "arquivo excede 20 MB")
		return
	}

	folder := sanitize(c.PostForm("folder"))
	name := uuid.New().String() + ext
	rel := name
	if folder != "" {
		rel = folder + "/" + name
	}
	dest := filepath.Join(h.dir, filepath.FromSlash(rel))
	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao preparar destino")
		return
	}

	src, err := file.Open()
	if err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao ler upload")
		return
	}
	defer src.Close()
	out, err := os.Create(dest)
	if err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao gravar arquivo")
		return
	}
	defer out.Close()
	if _, err := io.Copy(out, src); err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao salvar arquivo")
		return
	}

	url := fmt.Sprintf("%s/api/v1/files/%s", strings.TrimRight(h.publicURL, "/"), rel)
	c.JSON(http.StatusCreated, gin.H{"url": url, "path": rel})
}

// Serve: GET /files/*path — entrega o arquivo.
func (h *Handler) Serve(c *gin.Context) {
	rel := strings.TrimPrefix(c.Param("path"), "/")
	// impede path traversal
	clean := filepath.Clean(filepath.FromSlash(rel))
	if strings.HasPrefix(clean, "..") || filepath.IsAbs(clean) {
		httpx.Error(c, http.StatusBadRequest, "caminho inválido")
		return
	}
	full := filepath.Join(h.dir, clean)
	if _, err := os.Stat(full); err != nil {
		httpx.Error(c, http.StatusNotFound, "arquivo não encontrado")
		return
	}
	c.File(full)
}

func sanitize(s string) string {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, "..", "")
	s = strings.Trim(s, "/")
	// mantém apenas segmentos simples
	parts := strings.Split(s, "/")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.Map(func(r rune) rune {
			if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
				return r
			}
			return -1
		}, p)
		if p != "" {
			out = append(out, p)
		}
	}
	return strings.Join(out, "/")
}
