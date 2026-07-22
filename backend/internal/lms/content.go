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

// ───────────── Escopo por aluno ─────────────

// isStaff — papéis que administram o LMS e podem ver/gravar dados de qualquer
// aluno. Espelha o grupo lmsAdmin do router.
func isStaff(c *gin.Context) bool {
	switch middleware.Role(c) {
	case "admin", "coordenador", "instrutor":
		return true
	}
	return false
}

// scopedStudentID resolve de quem são os dados que a requisição pode tocar.
// O aluno alcança apenas a si mesmo: um student_id vindo do cliente só é
// respeitado para staff. Sem isso, qualquer autenticado lê e grava progresso,
// notas e certificados de qualquer outro aluno.
func scopedStudentID(c *gin.Context, requested string) uuid.UUID {
	self := middleware.UserID(c)
	if requested == "" || !isStaff(c) {
		return self
	}
	id, err := uuid.Parse(requested)
	if err != nil {
		return self
	}
	return id
}

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
// Sem student_id o padrão é o próprio usuário — antes a ausência do filtro
// devolvia os logs de todos os alunos.
func (h *Handler) ListTimeLogs(c *gin.Context) {
	list := []models.LMSTimeLog{}
	q := h.db.Order("created_at DESC").
		Where("student_id = ?", scopedStudentID(c, c.Query("student_id")))
	if err := q.Find(&list).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao carregar os registros de tempo")
		return
	}
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
	requested := ""
	if t.StudentID != nil {
		requested = t.StudentID.String()
	}
	sid := scopedStudentID(c, requested)
	t.StudentID = &sid
	if err := h.db.Create(&t).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao registrar o tempo de estudo")
		return
	}
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
	list := []models.LMSStudentProgress{}
	err := h.db.Where("student_id = ?", scopedStudentID(c, c.Query("student_id"))).Find(&list).Error
	if err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao carregar o progresso")
		return
	}
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
	requested := ""
	if body.StudentID != nil {
		requested = body.StudentID.String()
	}
	sid := scopedStudentID(c, requested)

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
	p.LastAccessed = time.Now()
	if p.ID == uuid.Nil {
		err = h.db.Create(&p).Error
	} else {
		err = h.db.Save(&p).Error
	}
	if err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao salvar o progresso")
		return
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
// Para o aluno as questões saem SEM correct_option_index: o gabarito só é
// revelado na resposta de SubmitQuizResult, depois da prova entregue.
func (h *Handler) GetQuiz(c *gin.Context) {
	var quiz models.LMSQuiz
	if err := h.db.First(&quiz, "id = ?", c.Param("id")).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "quiz não encontrado")
		return
	}
	questions := []models.LMSQuestion{}
	if err := h.db.Where("quiz_id = ?", quiz.ID).Find(&questions).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao carregar as questões")
		return
	}
	if isStaff(c) {
		c.JSON(http.StatusOK, gin.H{"quiz": quiz, "questions": questions})
		return
	}
	out := make([]gin.H, 0, len(questions))
	for _, q := range questions {
		out = append(out, gin.H{
			"id":            q.ID,
			"quiz_id":       q.QuizID,
			"question_text": q.QuestionText,
			"image_url":     q.ImageURL,
			"options":       q.Options,
		})
	}
	c.JSON(http.StatusOK, gin.H{"quiz": quiz, "questions": out})
}

func (h *Handler) CreateQuiz(c *gin.Context) {
	var quiz models.LMSQuiz
	if err := c.ShouldBindJSON(&quiz); err != nil {
		httpx.Error(c, http.StatusBadRequest, "dados inválidos")
		return
	}
	if quiz.CourseID == nil || quiz.ModuleID == nil || quiz.Title == "" {
		httpx.Error(c, http.StatusBadRequest, "curso, módulo e título são obrigatórios")
		return
	}
	if quiz.QuizType != nil && *quiz.QuizType == "final_exam" {
		var count int64
		h.db.Model(&models.LMSQuiz{}).
			Where("course_id = ? AND quiz_type = ?", *quiz.CourseID, "final_exam").
			Count(&count)
		if count > 0 {
			httpx.Error(c, http.StatusConflict, "o curso já possui uma prova final")
			return
		}
	}
	quiz.ID = uuid.Nil
	if err := h.db.Create(&quiz).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao criar quiz")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"quiz": quiz})
}
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
// O cliente envia apenas as respostas escolhidas; nota, aprovação e número da
// tentativa são calculados aqui contra lms_questions. Aceitar score/is_approved
// do corpo permitia forjar aprovação e, com ela, o certificado de conclusão.
func (h *Handler) SubmitQuizResult(c *gin.Context) {
	var body struct {
		QuizID  uuid.UUID      `json:"quiz_id" binding:"required"`
		Answers map[string]int `json:"answers"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "quiz_id é obrigatório")
		return
	}

	var quiz models.LMSQuiz
	if err := h.db.First(&quiz, "id = ?", body.QuizID).Error; err != nil {
		httpx.Error(c, http.StatusNotFound, "quiz não encontrado")
		return
	}
	questions := []models.LMSQuestion{}
	if err := h.db.Where("quiz_id = ?", quiz.ID).Find(&questions).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao carregar as questões")
		return
	}
	if len(questions) == 0 {
		httpx.Error(c, http.StatusUnprocessableEntity, "prova sem questões cadastradas")
		return
	}

	sid := middleware.UserID(c)
	var attempts int64
	if err := h.db.Model(&models.LMSQuizResult{}).
		Where("student_id = ? AND quiz_id = ?", sid, quiz.ID).Count(&attempts).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao verificar tentativas")
		return
	}
	if quiz.MaxAttempts > 0 && attempts >= int64(quiz.MaxAttempts) {
		httpx.Error(c, http.StatusUnprocessableEntity, "número máximo de tentativas atingido")
		return
	}

	correct := 0
	feedback := make(map[string]any, len(questions))
	for _, q := range questions {
		chosen, answered := body.Answers[q.ID.String()]
		hit := answered && chosen == q.CorrectOptionIndex
		if hit {
			correct++
		}
		var userAnswer any
		if answered {
			userAnswer = chosen
		}
		feedback[q.ID.String()] = gin.H{
			"is_correct":     hit,
			"user_answer":    userAnswer,
			"correct_answer": q.CorrectOptionIndex,
		}
	}
	score := int(math.Round(float64(correct) / float64(len(questions)) * 100))
	passing := quiz.PassingGrade
	if passing <= 0 {
		passing = 70
	}

	// Cada tentativa é gravada com a nota real. A "melhor nota" deixa de ser
	// responsabilidade do cliente: quem precisa dela (elegibilidade do
	// certificado) já busca por is_approved/score DESC.
	result := models.LMSQuizResult{
		StudentID:     &sid,
		QuizID:        &quiz.ID,
		Score:         score,
		AttemptsCount: int(attempts) + 1,
		IsApproved:    score >= passing,
		CompletedAt:   time.Now(),
	}
	if err := h.db.Create(&result).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao salvar resultado")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"result": result, "feedback": feedback})
}

// ListQuizResults: GET /lms/quiz-results?student_id=&quiz_id=
func (h *Handler) ListQuizResults(c *gin.Context) {
	q := h.db.Model(&models.LMSQuizResult{}).Order("completed_at DESC")
	q = q.Where("student_id = ?", scopedStudentID(c, c.Query("student_id")))
	if qid := c.Query("quiz_id"); qid != "" {
		q = q.Where("quiz_id = ?", qid)
	}
	list := []models.LMSQuizResult{}
	if err := q.Find(&list).Error; err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao carregar resultados")
		return
	}
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
		// Listagem administrativa (todos os certificados) — só para staff.
		if !isStaff(c) {
			httpx.Error(c, http.StatusForbidden, "acesso negado para este papel")
			return
		}
		if err := q.Find(&list).Error; err != nil {
			httpx.Error(c, http.StatusInternalServerError, "falha ao carregar certificados")
			return
		}
		c.JSON(http.StatusOK, gin.H{"certificates": list})
		return
	}
	err := q.Where("student_id = ?", scopedStudentID(c, c.Query("student_id"))).Find(&list).Error
	if err != nil {
		httpx.Error(c, http.StatusInternalServerError, "falha ao carregar certificados")
		return
	}
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
//
// Esta validação só vale enquanto as tabelas que ela consulta não forem
// graváveis pelo próprio aluno: lms_student_progress aceita apenas o
// student_id do token, e is_approved em lms_quiz_results é calculado por
// SubmitQuizResult. Afrouxar qualquer um dos dois reabre a emissão forjada.
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
		meta["grade"] = math.Round(grade/float64(len(finals))) / 10
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

// maskCPF devolve o CPF como ***.456.789-** — o bastante para conferir a
// identidade sem publicar o documento inteiro.
func maskCPF(raw string) string {
	digits := make([]rune, 0, 11)
	for _, r := range raw {
		if r >= '0' && r <= '9' {
			digits = append(digits, r)
		}
	}
	if len(digits) != 11 {
		return ""
	}
	return "***." + string(digits[3:6]) + "." + string(digits[6:9]) + "-**"
}

// ValidateCertificate: GET /public/validate-certificate/:code (sem auth)
// Endpoint público: devolve só o necessário para conferir a autenticidade.
// A metadata crua fica de fora — ela carrega o CPF do aluno em texto claro.
func (h *Handler) ValidateCertificate(c *gin.Context) {
	var cert models.LMSIssuedCertificate
	if err := h.db.First(&cert, "code = ?", c.Param("code")).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"valid": false})
		return
	}
	meta := map[string]any{}
	_ = json.Unmarshal(cert.Metadata, &meta)

	str := func(k string) string {
		if v, ok := meta[k].(string); ok {
			return v
		}
		return ""
	}
	public := gin.H{
		"id":           cert.ID,
		"code":         cert.Code,
		"issued_at":    cert.IssuedAt,
		"student_name": str("student_name"),
		"student_cpf":  maskCPF(str("cpf")),
		"course_name":  str("course_title"),
	}
	for _, k := range []string{"hours", "grade"} {
		if v, ok := meta[k]; ok {
			public[k] = v
		}
	}
	c.JSON(http.StatusOK, gin.H{"valid": true, "certificate": public})
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
		StudentName string     `json:"student_name"`
		LessonTitle string     `json:"lesson_title"`
		ModuleTitle string     `json:"module_title"`
		CourseTitle string     `json:"course_title"`
		CourseID    *uuid.UUID `json:"course_id,omitempty"`
		VideoURL    *string    `json:"video_url,omitempty"`
	}
	rows := []row{}
	query := h.db.Table("lms_lesson_questions q").
		Select("q.*, u.full_name as student_name, l.title as lesson_title, l.video_url, m.title as module_title, c.title as course_title, c.id as course_id").
		Joins("LEFT JOIN users u ON u.id = q.student_id").
		Joins("LEFT JOIN lms_lessons l ON l.id = q.lesson_id").
		Joins("LEFT JOIN lms_modules m ON m.id = l.module_id").
		Joins("LEFT JOIN lms_courses c ON c.id = m.course_id")
	if middleware.Role(c) == "instrutor" {
		uid := middleware.UserID(c)
		query = query.Where(`EXISTS (SELECT 1 FROM instructor_courses ic WHERE ic.course_id = c.id AND ic.instructor_id = ?)
			OR EXISTS (SELECT 1 FROM classes cl JOIN class_instructors ci ON ci.class_id = cl.id WHERE cl.lms_course_id = c.id AND ci.user_id = ?)`, uid, uid)
	}
	query.Order("q.created_at DESC").Scan(&rows)
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
	if middleware.Role(c) == "instrutor" {
		var allowed int64
		h.db.Table("lms_lessons l").
			Joins("JOIN lms_modules m ON m.id = l.module_id").
			Joins("JOIN lms_courses course ON course.id = m.course_id").
			Where("l.id = ?", d.LessonID).
			Where(`EXISTS (SELECT 1 FROM instructor_courses ic WHERE ic.course_id = course.id AND ic.instructor_id = ?)
				OR EXISTS (SELECT 1 FROM classes cl JOIN class_instructors ci ON ci.class_id = cl.id WHERE cl.lms_course_id = course.id AND ci.user_id = ?)`, middleware.UserID(c), middleware.UserID(c)).
			Count(&allowed)
		if allowed == 0 {
			httpx.Error(c, http.StatusForbidden, "sem acesso aos comentários desta aula")
			return
		}
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
