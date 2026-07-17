// Package students implementa o CRUD de alunos e leituras usadas pela gestão
// de turmas (alunos da turma, agendamento de aulas práticas).
package students

import (
	"net/http"

	"github.com/PITICALYN/cec-backend/internal/httpx"
	"github.com/PITICALYN/cec-backend/internal/middleware"
	"github.com/PITICALYN/cec-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Handler struct{ db *gorm.DB }

func NewHandler(db *gorm.DB) *Handler { return &Handler{db: db} }

// studentRow inclui dados da turma vinculada (nome/curso) para as telas.
type studentRow struct {
	models.Student
	TurmaName   *string `json:"turma_name,omitempty"`
	TurmaCourse *string `json:"turma_course,omitempty"`
}

// List: GET /students?turma_id=&practical_class_id=&status=&practical_null=true
func (h *Handler) List(c *gin.Context) {
	q := h.db.Table("students s").
		Select("s.*, cl.name as turma_name, cl.course_name as turma_course").
		Joins("LEFT JOIN classes cl ON cl.id = s.turma_id").
		Order("s.full_name")

	// O aluno só enxerga o próprio cadastro (ignora filtros de user_id de
	// outros); o staff pode filtrar por user_id livremente.
	if middleware.Role(c) == "aluno" {
		q = q.Where("s.user_id = ?", middleware.UserID(c))
	} else if v := c.Query("user_id"); v != "" {
		q = q.Where("s.user_id = ?", v)
	}
	if v := c.Query("turma_id"); v != "" {
		q = q.Where("s.turma_id = ?", v)
	}
	if v := c.Query("practical_class_id"); v != "" {
		q = q.Where("s.practical_class_id = ?", v)
	}
	if v := c.Query("status"); v != "" {
		q = q.Where("s.status = ?", v)
	}
	if c.Query("practical_null") == "true" {
		q = q.Where("s.practical_class_id IS NULL")
	}

	rows := []studentRow{}
	if err := q.Scan(&rows).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao listar alunos")
		return
	}
	c.JSON(http.StatusOK, gin.H{"students": rows})
}

// ClassStudents: GET /classes/:id/students — alunos da turma com notas e faltas.
func (h *Handler) ClassStudents(c *gin.Context) {
	classID := c.Param("id")
	var list []models.Student
	if err := h.db.Where("turma_id = ?", classID).Order("full_name").Find(&list).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao carregar alunos")
		return
	}
	ids := make([]uuid.UUID, 0, len(list))
	for _, s := range list {
		ids = append(ids, s.ID)
	}

	acadByStudent := map[uuid.UUID][]models.AcademicRecord{}
	attByStudent := map[uuid.UUID][]models.AttendanceRecord{}
	if len(ids) > 0 {
		var acad []models.AcademicRecord
		h.db.Where("student_id IN ?", ids).Find(&acad)
		for _, a := range acad {
			if a.StudentID != nil {
				acadByStudent[*a.StudentID] = append(acadByStudent[*a.StudentID], a)
			}
		}
		var att []models.AttendanceRecord
		h.db.Where("student_id IN ?", ids).Find(&att)
		for _, a := range att {
			if a.StudentID != nil {
				attByStudent[*a.StudentID] = append(attByStudent[*a.StudentID], a)
			}
		}
	}

	type row struct {
		models.Student
		AcademicRecords   []models.AcademicRecord   `json:"academic_records"`
		AttendanceRecords []models.AttendanceRecord `json:"attendance_records"`
	}
	out := make([]row, 0, len(list))
	for _, s := range list {
		out = append(out, row{Student: s, AcademicRecords: acadByStudent[s.ID], AttendanceRecords: attByStudent[s.ID]})
	}
	c.JSON(http.StatusOK, gin.H{"students": out})
}

// Get: GET /students/:id
func (h *Handler) Get(c *gin.Context) {
	var s models.Student
	if err := h.db.First(&s, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "aluno não encontrado")
		return
	}
	c.JSON(http.StatusOK, gin.H{"student": s})
}

// Create: POST /students
func (h *Handler) Create(c *gin.Context) {
	var s models.Student
	if err := c.ShouldBindJSON(&s); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	s.ID = uuid.Nil
	if s.FullName == "" || s.CPF == "" {
		httpx.Error(c, http.StatusBadRequest, "nome e CPF são obrigatórios")
		return
	}
	if s.Status == "" {
		s.Status = "ativa"
	}
	if err := h.db.Create(&s).Error; err != nil {
		httpx.Error(c, http.StatusConflict, "falha ao criar aluno (CPF duplicado?)")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"student": s})
}

// Update: PUT /students/:id — atualização parcial (whitelist).
func (h *Handler) Update(c *gin.Context) {
	var s models.Student
	if err := h.db.First(&s, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "aluno não encontrado")
		return
	}
	var body map[string]any
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}

	// O aluno pode editar apenas o PRÓPRIO cadastro e só campos de autoatendimento
	// (aceite, documentos, contato, agendamento prático). O staff edita tudo.
	isAluno := middleware.Role(c) == "aluno"
	if isAluno && (s.UserID == nil || *s.UserID != middleware.UserID(c)) {
		httpx.Error(c, http.StatusForbidden, "acesso negado")
		return
	}

	staffAllowed := map[string]bool{
		"full_name": true, "cpf": true, "rg": true, "birth_date": true, "birth_place": true,
		"marital_status": true, "email": true, "phone": true, "education_level": true,
		"parents_names": true, "address": true, "turma_id": true, "status": true,
		"practical_class_id": true, "practical_class_status": true, "has_lms_access": true,
		"manual_signed": true, "is_online_only": true, "user_id": true,
		"base_value": true, "discount_value": true, "payment_method": true, "payment_status": true,
		"doc_photo_url": true, "doc_id_url": true, "doc_cpf_url": true, "doc_address_url": true,
		"doc_education_url": true, "progress_percent": true, "terms_accepted": true,
		"how_knew": true, "how_knew_other": true, "cancellation_date": true, "refund_value": true,
		"cancellation_reason": true, "cancellation_note": true, "doc_exams_url": true,
		"asaas_customer_id": true, "asaas_payment_id": true,
	}
	selfAllowed := map[string]bool{
		"terms_accepted": true, "phone": true, "email": true, "address": true,
		"marital_status": true, "education_level": true, "parents_names": true,
		"birth_place": true, "rg": true, "birth_date": true,
		"doc_photo_url": true, "doc_id_url": true, "doc_cpf_url": true,
		"doc_address_url": true, "doc_education_url": true, "doc_exams_url": true,
		"practical_class_id": true, "practical_class_status": true,
	}
	allowed := staffAllowed
	if isAluno {
		allowed = selfAllowed
	}
	updates := map[string]any{}
	for k, v := range body {
		if allowed[k] {
			updates[k] = v
		}
	}
	if err := h.db.Model(&s).Updates(updates).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao atualizar aluno")
		return
	}
	c.JSON(http.StatusOK, gin.H{"student": s})
}

// Delete: DELETE /students/:id
func (h *Handler) Delete(c *gin.Context) {
	if err := h.db.Delete(&models.Student{}, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao excluir aluno")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
