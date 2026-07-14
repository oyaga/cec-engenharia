// Package lms — catálogo de cursos (início do domínio LMS).
package lms

import (
	"net/http"

	"github.com/PITICALYN/cec-backend/internal/httpx"
	"github.com/PITICALYN/cec-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Handler struct{ db *gorm.DB }

func NewHandler(db *gorm.DB) *Handler { return &Handler{db: db} }

// ListPublic: GET /public/courses — só publicados (catálogo do site).
func (h *Handler) ListPublic(c *gin.Context) {
	list := []models.LMSCourse{}
	h.db.Where("is_published = ?", true).Order("title").Find(&list)
	c.JSON(http.StatusOK, gin.H{"courses": list})
}

// List: GET /courses (auth) — todos.
func (h *Handler) List(c *gin.Context) {
	list := []models.LMSCourse{}
	q := h.db.Order("title")
	if c.Query("published") == "true" {
		q = q.Where("is_published = ?", true)
	}
	q.Find(&list)
	c.JSON(http.StatusOK, gin.H{"courses": list})
}

// Get: GET /courses/:id
func (h *Handler) Get(c *gin.Context) {
	var course models.LMSCourse
	if err := h.db.First(&course, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "curso não encontrado")
		return
	}
	c.JSON(http.StatusOK, gin.H{"course": course})
}

// Create: POST /courses
func (h *Handler) Create(c *gin.Context) {
	var course models.LMSCourse
	if err := c.ShouldBindJSON(&course); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	course.ID = uuid.Nil
	if course.Title == "" {
		httpx.Error(c, http.StatusBadRequest, "título é obrigatório")
		return
	}
	if err := h.db.Create(&course).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao criar curso")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"course": course})
}

// Update: PUT /courses/:id
func (h *Handler) Update(c *gin.Context) {
	var course models.LMSCourse
	if err := h.db.First(&course, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "curso não encontrado")
		return
	}
	var body map[string]any
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	delete(body, "id")
	delete(body, "created_at")
	if err := h.db.Model(&course).Updates(body).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao atualizar curso")
		return
	}
	c.JSON(http.StatusOK, gin.H{"course": course})
}

// Delete: DELETE /courses/:id
func (h *Handler) Delete(c *gin.Context) {
	if err := h.db.Delete(&models.LMSCourse{}, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao excluir curso")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
