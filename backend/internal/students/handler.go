// Package students implementa o CRUD de alunos e leituras usadas pela gestão
// de turmas (alunos da turma, agendamento de aulas práticas).
package students

import (
	"errors"
	"html"
	"net/http"
	"strings"
	"time"

	"github.com/PITICALYN/cec-backend/internal/auth"
	"github.com/PITICALYN/cec-backend/internal/httpx"
	"github.com/PITICALYN/cec-backend/internal/mailer"
	"github.com/PITICALYN/cec-backend/internal/middleware"
	"github.com/PITICALYN/cec-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const welcomeTokenTTL = 72 * time.Hour

type Handler struct {
	db        *gorm.DB
	ml        *mailer.Mailer
	publicURL string
}

func NewHandler(db *gorm.DB, ml *mailer.Mailer, publicURL string) *Handler {
	return &Handler{db: db, ml: ml, publicURL: strings.TrimRight(publicURL, "/")}
}

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
		if strings.Contains(err.Error(), "birth_date") || strings.Contains(err.Error(), "time.Time") {
			httpx.Error(c, http.StatusBadRequest, "data de nascimento inválida")
			return
		}
		httpx.Error(c, http.StatusBadRequest, "dados inválidos no cadastro do aluno")
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

	var linkedUser *models.User
	accountCreated := false
	err := h.db.Transaction(func(tx *gorm.DB) error {
		if s.Email != nil && strings.TrimSpace(*s.Email) != "" {
			email := strings.ToLower(strings.TrimSpace(*s.Email))
			s.Email = &email

			var user models.User
			findErr := tx.Where("LOWER(email) = ?", email).First(&user).Error
			switch {
			case findErr == nil:
				if user.Role != "aluno" {
					return errStudentEmailRoleConflict
				}
			case errors.Is(findErr, gorm.ErrRecordNotFound):
				hash, hashErr := auth.HashPassword(uuid.NewString() + uuid.NewString())
				if hashErr != nil {
					return hashErr
				}
				user = models.User{
					Email:              email,
					PasswordHash:       hash,
					FullName:           s.FullName,
					Role:               "aluno",
					CPF:                &s.CPF,
					Phone:              s.Phone,
					IsActive:           true,
					MustChangePassword: true,
				}
				if createErr := tx.Create(&user).Error; createErr != nil {
					return createErr
				}
				accountCreated = true
			default:
				return findErr
			}
			s.UserID = &user.ID
			linkedUser = &user
		}
		return tx.Create(&s).Error
	})
	if err != nil {
		if errors.Is(err, errStudentEmailRoleConflict) {
			httpx.Error(c, http.StatusConflict, "este e-mail pertence a uma conta que não é de aluno")
			return
		}
		httpx.Error(c, http.StatusConflict, "falha ao criar aluno (CPF duplicado?)")
		return
	}
	if accountCreated {
		h.sendWelcome(linkedUser)
	}
	c.JSON(http.StatusCreated, gin.H{
		"student":         s,
		"user":            linkedUser,
		"account_created": accountCreated,
	})
}

var errStudentEmailRoleConflict = errors.New("student email belongs to a non-student account")

func (h *Handler) sendWelcome(user *models.User) {
	if user == nil || user.Email == "" || h.ml == nil || !h.ml.Enabled() {
		return
	}
	token, err := auth.IssueResetToken(h.db, user.ID, welcomeTokenTTL)
	if err != nil {
		return
	}
	link := h.publicURL + "/redefinir-senha?token=" + token
	name := html.EscapeString(strings.TrimSpace(user.FullName))
	if name == "" {
		name = "aluno(a)"
	}
	body := `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">` +
		`<h2 style="color:#0f172a;margin:0 0 16px">CEC Engenharia</h2>` +
		`<p>Olá, ` + name + `.</p>` +
		`<p>Sua matrícula e sua conta de acesso foram criadas. Defina sua senha pelo botão abaixo (o link vale por 3 dias):</p>` +
		`<p style="text-align:center;margin:28px 0"><a href="` + link + `" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block">Definir minha senha</a></p>` +
		`<p style="font-size:13px;color:#6b7280">Seu login é o e-mail <b>` + html.EscapeString(user.Email) + `</b>.</p>` +
		`<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">` +
		`<p style="font-size:12px;color:#9ca3af">Este é um e-mail automático — não responda.</p></div>`
	h.ml.SendAsync([]string{user.Email}, "Bem-vindo à CEC Engenharia — defina sua senha", body)
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
