package lms

import (
	"encoding/json"
	"math"
	"net/http"
	"time"

	"github.com/PITICALYN/cec-backend/internal/httpx"
	"github.com/PITICALYN/cec-backend/internal/middleware"
	"github.com/PITICALYN/cec-backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// ───────────── Estrutura do curso (módulos + aulas) ─────────────

type moduleWithLessons struct {
	models.LMSModule
	Lessons []models.LMSLesson `json:"lessons"`
}

// Structure: GET /courses/:id/structure — módulos ordenados com aulas.
func (h *Handler) Structure(c *gin.Context) {
	courseID := c.Param("id")
	var modules []models.LMSModule
	h.db.Where("course_id = ?", courseID).Order("order_index").Find(&modules)

	ids := make([]uuid.UUID, 0, len(modules))
	for _, m := range modules {
		ids = append(ids, m.ID)
	}
	lessonsByModule := map[uuid.UUID][]models.LMSLesson{}
	if len(ids) > 0 {
		var lessons []models.LMSLesson
		h.db.Where("module_id IN ?", ids).Order("order_index").Find(&lessons)
		for _, l := range lessons {
			if l.ModuleID != nil {
				lessonsByModule[*l.ModuleID] = append(lessonsByModule[*l.ModuleID], l)
			}
		}
	}
	out := make([]moduleWithLessons, 0, len(modules))
	for _, m := range modules {
		out = append(out, moduleWithLessons{LMSModule: m, Lessons: lessonsByModule[m.ID]})
	}
	c.JSON(http.StatusOK, gin.H{"modules": out})
}

// LessonDetail: GET /lms/lessons/:id — aula + módulo/curso (para o player).
func (h *Handler) LessonDetail(c *gin.Context) {
	var lesson models.LMSLesson
	if err := h.db.First(&lesson, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "aula não encontrada")
		return
	}
	out := gin.H{"lesson": lesson}
	if lesson.ModuleID != nil {
		var mod models.LMSModule
		if h.db.First(&mod, "id = ?", *lesson.ModuleID).Error == nil {
			out["module"] = mod
			if mod.CourseID != nil {
				var course models.LMSCourse
				if h.db.First(&course, "id = ?", *mod.CourseID).Error == nil {
					out["course"] = course
				}
			}
		}
	}
	c.JSON(http.StatusOK, out)
}

// CourseLessons: GET /courses/:id/lessons — todas as aulas do curso (flat).
func (h *Handler) CourseLessons(c *gin.Context) {
	var moduleIDs []uuid.UUID
	h.db.Model(&models.LMSModule{}).Where("course_id = ?", c.Param("id")).Pluck("id", &moduleIDs)
	lessons := []models.LMSLesson{}
	if len(moduleIDs) > 0 {
		h.db.Where("module_id IN ?", moduleIDs).Order("order_index").Find(&lessons)
	}
	c.JSON(http.StatusOK, gin.H{"lessons": lessons})
}

// GetTaskSubmission: GET /lms/task-submissions?lesson_id=
func (h *Handler) GetTaskSubmission(c *gin.Context) {
	sid := middleware.UserID(c)
	var sub models.TaskSubmission
	err := h.db.Where("student_id = ? AND lesson_id = ?", sid, c.Query("lesson_id")).First(&sub).Error
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"submission": nil})
		return
	}
	c.JSON(http.StatusOK, gin.H{"submission": sub})
}

// UpsertTaskSubmission: POST /lms/task-submissions
func (h *Handler) UpsertTaskSubmission(c *gin.Context) {
	var body struct {
		LessonID uuid.UUID `json:"lesson_id" binding:"required"`
		FileURL  string    `json:"file_url"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "lesson_id é obrigatório")
		return
	}
	sid := middleware.UserID(c)
	var sub models.TaskSubmission
	err := h.db.Where("student_id = ? AND lesson_id = ?", sid, body.LessonID).First(&sub).Error
	if err != nil {
		sub = models.TaskSubmission{StudentID: &sid, LessonID: &body.LessonID}
	}
	sub.FileURL = &body.FileURL
	sub.Status = "enviado"
	if sub.ID == uuid.Nil {
		h.db.Create(&sub)
	} else {
		h.db.Save(&sub)
	}
	c.JSON(http.StatusOK, gin.H{"submission": sub})
}

// ListTimeLogs: GET /lms/time-logs?student_id=
func (h *Handler) ListTimeLogs(c *gin.Context) {
	list := []models.LMSTimeLog{}
	q := h.db.Order("created_at DESC")
	if sid := c.Query("student_id"); sid != "" {
		q = q.Where("student_id = ?", sid)
	}
	q.Find(&list)
	c.JSON(http.StatusOK, gin.H{"logs": list})
}

// LogTime: POST /lms/time-logs — heartbeat de estudo.
func (h *Handler) LogTime(c *gin.Context) {
	var t models.LMSTimeLog
	if err := c.ShouldBindJSON(&t); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	t.ID = uuid.Nil
	if t.StudentID == nil {
		sid := middleware.UserID(c)
		t.StudentID = &sid
	}
	h.db.Create(&t)
	c.JSON(http.StatusCreated, gin.H{"ok": true})
}

// Módulos
func (h *Handler) CreateModule(c *gin.Context) { h.create(c, &models.LMSModule{}, "module") }
func (h *Handler) UpdateModule(c *gin.Context) { h.update(c, &models.LMSModule{}, "module") }
func (h *Handler) DeleteModule(c *gin.Context) {
	h.db.Delete(&models.LMSModule{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// Aulas
func (h *Handler) CreateLesson(c *gin.Context) { h.create(c, &models.LMSLesson{}, "lesson") }
func (h *Handler) UpdateLesson(c *gin.Context) { h.update(c, &models.LMSLesson{}, "lesson") }
func (h *Handler) DeleteLesson(c *gin.Context) {
	h.db.Delete(&models.LMSLesson{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ───────────── Progresso do aluno ─────────────

// ListProgress: GET /lms/progress?student_id=
func (h *Handler) ListProgress(c *gin.Context) {
	sid := c.Query("student_id")
	if sid == "" {
		sid = middleware.UserID(c).String()
	}
	list := []models.LMSStudentProgress{}
	h.db.Where("student_id = ?", sid).Find(&list)
	c.JSON(http.StatusOK, gin.H{"progress": list})
}

// UpsertProgress: POST /lms/progress — cria/atualiza por (student, lesson).
func (h *Handler) UpsertProgress(c *gin.Context) {
	var body struct {
		StudentID      *uuid.UUID `json:"student_id"`
		LessonID       uuid.UUID  `json:"lesson_id" binding:"required"`
		WatchedSeconds int        `json:"watched_seconds"`
		IsCompleted    bool       `json:"is_completed"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "lesson_id é obrigatório")
		return
	}
	sid := middleware.UserID(c)
	if body.StudentID != nil {
		sid = *body.StudentID
	}
	var p models.LMSStudentProgress
	err := h.db.Where("student_id = ? AND lesson_id = ?", sid, body.LessonID).First(&p).Error
	if err != nil {
		p = models.LMSStudentProgress{StudentID: &sid, LessonID: &body.LessonID}
	}
	if body.WatchedSeconds > p.WatchedSeconds {
		p.WatchedSeconds = body.WatchedSeconds
	}
	if body.IsCompleted {
		p.IsCompleted = true
	}
	if p.ID == uuid.Nil {
		h.db.Create(&p)
	} else {
		h.db.Save(&p)
	}
	c.JSON(http.StatusOK, gin.H{"progress": p})
}

// ───────────── Quizzes e questões ─────────────

// ListQuizzes: GET /courses/:id/quizzes
func (h *Handler) ListQuizzes(c *gin.Context) {
	list := []models.LMSQuiz{}
	h.db.Where("course_id = ?", c.Param("id")).Order("created_at").Find(&list)
	c.JSON(http.StatusOK, gin.H{"quizzes": list})
}

// GetQuiz: GET /lms/quizzes/:id — com questões.
func (h *Handler) GetQuiz(c *gin.Context) {
	var quiz models.LMSQuiz
	if err := h.db.First(&quiz, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "quiz não encontrado")
		return
	}
	questions := []models.LMSQuestion{}
	h.db.Where("quiz_id = ?", quiz.ID).Find(&questions)
	c.JSON(http.StatusOK, gin.H{"quiz": quiz, "questions": questions})
}

func (h *Handler) CreateQuiz(c *gin.Context) { h.create(c, &models.LMSQuiz{}, "quiz") }
func (h *Handler) UpdateQuiz(c *gin.Context) { h.update(c, &models.LMSQuiz{}, "quiz") }
func (h *Handler) DeleteQuiz(c *gin.Context) {
	h.db.Delete(&models.LMSQuiz{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
func (h *Handler) CreateQuestion(c *gin.Context) { h.create(c, &models.LMSQuestion{}, "question") }
func (h *Handler) UpdateQuestion(c *gin.Context) { h.update(c, &models.LMSQuestion{}, "question") }
func (h *Handler) DeleteQuestion(c *gin.Context) {
	h.db.Delete(&models.LMSQuestion{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ───────────── Resultados de prova ─────────────

// SubmitQuizResult: POST /lms/quiz-results
func (h *Handler) SubmitQuizResult(c *gin.Context) {
	var r models.LMSQuizResult
	if err := c.ShouldBindJSON(&r); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	r.ID = uuid.Nil
	if r.StudentID == nil {
		sid := middleware.UserID(c)
		r.StudentID = &sid
	}
	if err := h.db.Create(&r).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao salvar resultado")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"result": r})
}

// ListQuizResults: GET /lms/quiz-results?student_id=&quiz_id=
func (h *Handler) ListQuizResults(c *gin.Context) {
	q := h.db.Model(&models.LMSQuizResult{}).Order("completed_at DESC")
	sid := c.Query("student_id")
	if sid == "" {
		sid = middleware.UserID(c).String()
	}
	q = q.Where("student_id = ?", sid)
	if qid := c.Query("quiz_id"); qid != "" {
		q = q.Where("quiz_id = ?", qid)
	}
	list := []models.LMSQuizResult{}
	q.Find(&list)
	c.JSON(http.StatusOK, gin.H{"results": list})
}

// ───────────── Fórum ─────────────

// AllForumTopics: GET /lms/forum-topics — todos os tópicos (fórum geral).
func (h *Handler) AllForumTopics(c *gin.Context) {
	type row struct {
		models.LMSForumTopic
		StudentName string `json:"student_name"`
	}
	rows := []row{}
	h.db.Table("lms_forum_topics t").
		Select("t.*, u.full_name as student_name").
		Joins("LEFT JOIN users u ON u.id = t.student_id").
		Order("t.created_at DESC").Limit(200).Scan(&rows)
	c.JSON(http.StatusOK, gin.H{"topics": rows})
}

// LessonForum: GET /lms/lessons/:id/forum — tópicos + respostas.
func (h *Handler) LessonForum(c *gin.Context) {
	topics := []models.LMSForumTopic{}
	h.db.Where("lesson_id = ?", c.Param("id")).Order("created_at DESC").Find(&topics)
	c.JSON(http.StatusOK, gin.H{"topics": topics})
}

func (h *Handler) CreateTopic(c *gin.Context) { h.create(c, &models.LMSForumTopic{}, "topic") }
func (h *Handler) CreateReply(c *gin.Context) { h.create(c, &models.LMSForumReply{}, "reply") }

func (h *Handler) TopicReplies(c *gin.Context) {
	replies := []models.LMSForumReply{}
	h.db.Where("topic_id = ?", c.Param("id")).Order("created_at").Find(&replies)
	c.JSON(http.StatusOK, gin.H{"replies": replies})
}

// ───────────── Certificados ─────────────

// ListCertificates: GET /lms/certificates?student_id=  (ou ?all=true p/ gestão)
func (h *Handler) ListCertificates(c *gin.Context) {
	list := []models.LMSIssuedCertificate{}
	q := h.db.Order("issued_at DESC")
	if c.Query("all") == "true" {
		// Listagem administrativa (todos os certificados).
		q.Find(&list)
		c.JSON(http.StatusOK, gin.H{"certificates": list})
		return
	}
	sid := c.Query("student_id")
	if sid == "" {
		sid = middleware.UserID(c).String()
	}
	q.Where("student_id = ?", sid).Find(&list)
	c.JSON(http.StatusOK, gin.H{"certificates": list})
}

// IssueCertificate: POST /lms/certificates
func (h *Handler) IssueCertificate(c *gin.Context) {
	var cert models.LMSIssuedCertificate
	if err := c.ShouldBindJSON(&cert); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	cert.ID = uuid.Nil
	if cert.Code == "" {
		cert.Code = "CEC-" + uuid.New().String()[:8]
	}
	if err := h.db.Create(&cert).Error; err != nil {
		httpx.Error(c, http.StatusConflict, "falha ao emitir certificado")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"certificate": cert})
}

// ClaimCertificate: POST /lms/certificates/claim — o próprio aluno emite o
// certificado após concluir o curso. A elegibilidade é validada AQUI no
// servidor (100% das aulas + aprovação na prova final, se houver), portanto
// o endpoint pode ficar aberto a qualquer usuário autenticado. Idempotente:
// se já existe certificado para (aluno, curso), devolve o existente.
func (h *Handler) ClaimCertificate(c *gin.Context) {
	var body struct {
		CourseID uuid.UUID `json:"course_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "course_id é obrigatório")
		return
	}
	sid := middleware.UserID(c)

	var existing models.LMSIssuedCertificate
	if h.db.First(&existing, "student_id = ? AND course_id = ?", sid, body.CourseID).Error == nil {
		c.JSON(http.StatusOK, gin.H{"certificate": existing, "already_issued": true})
		return
	}

	var course models.LMSCourse
	if err := h.db.First(&course, "id = ?", body.CourseID).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "curso não encontrado")
		return
	}

	// 100% das aulas do curso concluídas
	var lessonIDs []uuid.UUID
	h.db.Model(&models.LMSLesson{}).
		Joins("JOIN lms_modules m ON m.id = lms_lessons.module_id").
		Where("m.course_id = ?", body.CourseID).
		Pluck("lms_lessons.id", &lessonIDs)
	if len(lessonIDs) == 0 {
		httpx.Error(c, http.StatusUnprocessableEntity, "curso sem aulas cadastradas")
		return
	}
	var done int64
	h.db.Model(&models.LMSStudentProgress{}).
		Where("student_id = ? AND is_completed = true AND lesson_id IN ?", sid, lessonIDs).
		Count(&done)
	if int(done) < len(lessonIDs) {
		httpx.Error(c, http.StatusUnprocessableEntity, "conclua todas as aulas do curso para emitir o certificado")
		return
	}

	// Prova final aprovada (quando o curso tiver quiz_type=final_exam)
	grade := 0.0
	hasGrade := false
	var finals []models.LMSQuiz
	h.db.Where("course_id = ? AND quiz_type = ?", body.CourseID, "final_exam").Find(&finals)
	for _, q := range finals {
		var best models.LMSQuizResult
		if h.db.Where("student_id = ? AND quiz_id = ? AND is_approved = true", sid, q.ID).
			Order("score DESC").First(&best).Error != nil {
			httpx.Error(c, http.StatusUnprocessableEntity, "aprovação na prova final é necessária para emitir o certificado")
			return
		}
		grade += float64(best.Score)
		hasGrade = true
	}

	var user models.User
	h.db.First(&user, "id = ?", sid)
	hours := 0
	if course.MinTheoreticalHours != nil {
		hours = *course.MinTheoreticalHours
	}
	meta := map[string]any{
		"student_name": user.FullName,
		"course_title": course.Title,
		"hours":        hours,
		"issue_type":   "conclusao",
	}
	if user.CPF != nil {
		meta["cpf"] = *user.CPF
	}
	if hasGrade {
		// score é 0-100; nota exibida é 0-10 com 1 casa
		meta["grade"] = math.Round(grade/float64(len(finals)))/10
	}
	metaJSON, _ := json.Marshal(meta)

	cert := models.LMSIssuedCertificate{
		StudentID: &sid,
		CourseID:  &course.ID,
		Code:      uuid.NewString(),
		Metadata:  datatypes.JSON(metaJSON),
	}
	if err := h.db.Create(&cert).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao emitir certificado")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"certificate": cert})
}

// ValidateCertificate: GET /public/validate-certificate/:code (sem auth)
func (h *Handler) ValidateCertificate(c *gin.Context) {
	var cert models.LMSIssuedCertificate
	if err := h.db.First(&cert, "code = ?", c.Param("code")).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"valid": false})
		return
	}
	c.JSON(http.StatusOK, gin.H{"valid": true, "certificate": cert})
}

// ───────────── Avisos (lms_announcements) ─────────────

func (h *Handler) ListAnnouncements(c *gin.Context) {
	list := []models.LMSAnnouncement{}
	q := h.db.Order("created_at DESC")
	if cid := c.Query("course_id"); cid != "" {
		q = q.Where("course_id = ? OR course_id IS NULL", cid)
	}
	q.Find(&list)
	c.JSON(http.StatusOK, gin.H{"announcements": list})
}
func (h *Handler) CreateAnnouncement(c *gin.Context) {
	h.create(c, &models.LMSAnnouncement{}, "announcement")
}
func (h *Handler) UpdateAnnouncement(c *gin.Context) {
	h.update(c, &models.LMSAnnouncement{}, "announcement")
}
func (h *Handler) DeleteAnnouncement(c *gin.Context) {
	h.db.Delete(&models.LMSAnnouncement{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ───────────── Banco de questões (lms_question_bank) ─────────────

func (h *Handler) ListQuestionBank(c *gin.Context) {
	list := []models.LMSQuestionBank{}
	q := h.db.Order("created_at DESC")
	if cat := c.Query("category"); cat != "" {
		q = q.Where("category = ?", cat)
	}
	q.Find(&list)
	c.JSON(http.StatusOK, gin.H{"questions": list})
}
func (h *Handler) CreateQuestionBank(c *gin.Context) {
	h.create(c, &models.LMSQuestionBank{}, "question")
}
func (h *Handler) DeleteQuestionBank(c *gin.Context) {
	h.db.Delete(&models.LMSQuestionBank{}, "id = ?", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ───────────── Dúvidas dos alunos (lms_lesson_questions) ─────────────

// ListDoubts: GET /lms/doubts — todas as dúvidas com nome do aluno e aula (admin).
func (h *Handler) ListDoubts(c *gin.Context) {
	type row struct {
		models.LMSLessonQuestion
		StudentName string `json:"student_name"`
		LessonTitle string `json:"lesson_title"`
	}
	rows := []row{}
	h.db.Table("lms_lesson_questions q").
		Select("q.*, u.full_name as student_name, l.title as lesson_title").
		Joins("LEFT JOIN users u ON u.id = q.student_id").
		Joins("LEFT JOIN lms_lessons l ON l.id = q.lesson_id").
		Order("q.created_at DESC").Scan(&rows)
	c.JSON(http.StatusOK, gin.H{"doubts": rows})
}

// ListLessonDoubts: GET /lms/lessons/:id/doubts — dúvidas de uma aula.
func (h *Handler) ListLessonDoubts(c *gin.Context) {
	list := []models.LMSLessonQuestion{}
	h.db.Where("lesson_id = ?", c.Param("id")).Order("created_at DESC").Find(&list)
	c.JSON(http.StatusOK, gin.H{"doubts": list})
}

// CreateDoubt: POST /lms/doubts — aluno registra dúvida.
func (h *Handler) CreateDoubt(c *gin.Context) {
	var d models.LMSLessonQuestion
	if err := c.ShouldBindJSON(&d); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	d.ID = uuid.Nil
	if d.StudentID == nil {
		sid := middleware.UserID(c)
		d.StudentID = &sid
	}
	if err := h.db.Create(&d).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao registrar dúvida")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"doubt": d})
}

// AnswerDoubt: PUT /lms/doubts/:id — instrutor/coordenador responde.
func (h *Handler) AnswerDoubt(c *gin.Context) {
	var d models.LMSLessonQuestion
	if err := h.db.First(&d, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "dúvida não encontrada")
		return
	}
	var body struct {
		AnswerText string `json:"answer_text" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "resposta é obrigatória")
		return
	}
	now := time.Now()
	uid := middleware.UserID(c)
	h.db.Model(&d).Updates(map[string]any{
		"answer_text": body.AnswerText, "answered_by": uid, "answered_at": now,
	})
	c.JSON(http.StatusOK, gin.H{"doubt": d})
}

// ───────────── helpers genéricos de create/update ─────────────

func (h *Handler) create(c *gin.Context, model any, key string) {
	if err := c.ShouldBindJSON(model); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	if err := h.db.Create(model).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao criar "+key)
		return
	}
	c.JSON(http.StatusCreated, gin.H{key: model})
}

func (h *Handler) update(c *gin.Context, model any, key string) {
	if err := h.db.First(model, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, key+" não encontrado")
		return
	}
	var body map[string]any
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	delete(body, "id")
	if err := h.db.Model(model).Updates(body).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao atualizar "+key)
		return
	}
	c.JSON(http.StatusOK, gin.H{key: model})
}
