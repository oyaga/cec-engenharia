package lms

import (
	"net/http"

	"github.com/PITICALYN/cec-backend/internal/httpx"
	"github.com/PITICALYN/cec-backend/internal/middleware"
	"github.com/PITICALYN/cec-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// courseWithProgress — curso matriculado + progresso teórico calculado.
type courseWithProgress struct {
	models.LMSCourse
	ProgressPercent int `json:"progress_percent"`
}

// MyCourses: GET /lms/my-courses — cursos EAD em que o aluno está matriculado,
// cada um com o progresso teórico (aulas concluídas / total). Um aluno pode ter
// vários cursos; a fonte é a tabela lms_enrollments.
func (h *Handler) MyCourses(c *gin.Context) {
	uid := middleware.UserID(c)

	var courses []models.LMSCourse
	// Não filtra por is_published: se o aluno está matriculado, vê o curso
	// independentemente do status de publicação (pode ser um rascunho liberado
	// antecipadamente para a turma).
	h.db.Table("lms_courses").
		Joins("JOIN lms_enrollments e ON e.course_id = lms_courses.id").
		Where("e.user_id = ?", uid).
		Order("lms_courses.title").
		Find(&courses)

	out := make([]courseWithProgress, 0, len(courses))
	for _, co := range courses {
		var total, done int64
		h.db.Table("lms_lessons l").
			Joins("JOIN lms_modules m ON m.id = l.module_id").
			Where("m.course_id = ?", co.ID).
			Count(&total)
		h.db.Table("lms_student_progress p").
			Joins("JOIN lms_lessons l ON l.id = p.lesson_id").
			Joins("JOIN lms_modules m ON m.id = l.module_id").
			Where("m.course_id = ? AND p.student_id = ? AND p.is_completed", co.ID, uid).
			Count(&done)
		pct := 0
		if total > 0 {
			pct = int(done * 100 / total)
		}
		out = append(out, courseWithProgress{LMSCourse: co, ProgressPercent: pct})
	}
	c.JSON(http.StatusOK, gin.H{"courses": out})
}

type enrollRequest struct {
	UserID   uuid.UUID `json:"user_id" binding:"required"`
	CourseID uuid.UUID `json:"course_id" binding:"required"`
}

// Enroll: POST /lms/enrollments — staff matricula um aluno em um curso EAD.
func (h *Handler) Enroll(c *gin.Context) {
	var r enrollRequest
	if err := c.ShouldBindJSON(&r); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	en := models.LMSEnrollment{UserID: r.UserID, CourseID: r.CourseID}
	// Idempotente: se já existe a matrícula, apenas retorna a existente.
	if err := h.db.Where("user_id = ? AND course_id = ?", r.UserID, r.CourseID).
		FirstOrCreate(&en).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao matricular")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"enrollment": en})
}

// Unenroll: DELETE /lms/enrollments?user_id=&course_id= — staff remove a matrícula.
func (h *Handler) Unenroll(c *gin.Context) {
	uid := c.Query("user_id")
	cid := c.Query("course_id")
	if uid == "" || cid == "" {
		httpx.Error(c, http.StatusBadRequest, "user_id e course_id obrigatórios")
		return
	}
	h.db.Where("user_id = ? AND course_id = ?", uid, cid).Delete(&models.LMSEnrollment{})
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
