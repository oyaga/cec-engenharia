package router

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/PITICALYN/cec-backend/internal/academic"
	"github.com/PITICALYN/cec-backend/internal/asaas"
	"github.com/PITICALYN/cec-backend/internal/audit"
	"github.com/PITICALYN/cec-backend/internal/auth"
	"github.com/PITICALYN/cec-backend/internal/cache"
	"github.com/PITICALYN/cec-backend/internal/chat"
	"github.com/PITICALYN/cec-backend/internal/config"
	"github.com/PITICALYN/cec-backend/internal/financial"
	"github.com/PITICALYN/cec-backend/internal/lms"
	"github.com/PITICALYN/cec-backend/internal/mailer"
	"github.com/PITICALYN/cec-backend/internal/maria"
	"github.com/PITICALYN/cec-backend/internal/middleware"
	"github.com/PITICALYN/cec-backend/internal/misc"
	"github.com/PITICALYN/cec-backend/internal/settings"
	"github.com/PITICALYN/cec-backend/internal/site"
	"github.com/PITICALYN/cec-backend/internal/staff"
	"github.com/PITICALYN/cec-backend/internal/storage"
	"github.com/PITICALYN/cec-backend/internal/students"
	"github.com/PITICALYN/cec-backend/internal/users"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Chaves de cache dos endpoints públicos (invalidação nas rotas de escrita).
const (
	ckSiteContent  = "cache:public:site-content"
	ckCourses      = "cache:public:courses"
	ckTestimonials = "cache:public:testimonials"
	ckUpcoming     = "cache:public:upcoming-classes"
)

// New monta o roteador Gin com todas as rotas registradas.
func New(cfg *config.Config, gdb *gorm.DB, tm *auth.TokenManager, cch *cache.Cache) *gin.Engine {
	if cfg.IsProd() {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	// Headers de segurança (hardening). HSTS só em produção (HTTPS).
	r.Use(func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("X-XSS-Protection", "0")
		if cfg.IsProd() {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		// CSP só quando a API também serve o SPA (imagem única).
		// frame-src: 'self' (PDFs/vídeos locais em iframe no player) +
		// Google Maps (rodapé) + YouTube/Vimeo (videoaulas embedadas).
		if cfg.WebDir != "" {
			c.Header("Content-Security-Policy", "default-src 'self'; img-src 'self' data: https:; media-src 'self' https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-src 'self' https://maps.google.com https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com; frame-ancestors 'none'")
		}
		c.Next()
	})

	r.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.GET("/health", func(c *gin.Context) {
		redisStatus := "disabled"
		if cch.Enabled() {
			if err := cch.Ping(c.Request.Context()); err == nil {
				redisStatus = "up"
			} else {
				redisStatus = "down"
			}
		}
		c.JSON(200, gin.H{"status": "ok", "redis": redisStatus})
	})

	ml := mailer.New(cfg.ResendAPIKey, cfg.MailFrom)
	authH := auth.NewHandler(gdb, tm, ml, cfg.PublicURL)

	v1 := r.Group("/api/v1")
	{
		a := v1.Group("/auth")
		a.POST("/login", authH.Login)
		a.POST("/forgot-password", authH.ForgotPassword)
		a.POST("/reset-password", authH.ResetPassword)

		protected := a.Group("")
		protected.Use(middleware.RequireAuth(tm))
		protected.GET("/me", authH.Me)
		protected.POST("/change-password", authH.ChangePassword)
		protected.POST("/set-initial-password", authH.SetInitialPassword)
		protected.POST("/verify-manager", authH.VerifyManager)

		// ─── Users (identidade) — RBAC admin/coordenador ───
		usersH := users.NewHandler(gdb, ml, cfg.PublicURL)
		u := v1.Group("/users")
		u.Use(middleware.RequireAuth(tm), middleware.RequireRole("admin", "coordenador"))
		u.GET("", usersH.List)
		u.POST("", usersH.Create)
		u.GET("/:id", usersH.Get)
		u.PUT("/:id", usersH.Update)
		u.POST("/:id/reset-password", usersH.ResetPassword)
		u.DELETE("/:id", usersH.Delete)

		// ─── Site público (sem auth) ───
		siteH := site.NewHandler(gdb, ml, cfg.SecretariaEmail)
		pub := v1.Group("/public")
		pub.POST("/leads", siteH.CreateLeadPublic)
		pub.POST("/complaints", siteH.CreateComplaintPublic)
		pub.POST("/enrollments", siteH.CreateEnrollmentPublic)
		pub.POST("/testimonials", cch.InvalidateOn(ckTestimonials), siteH.CreateTestimonialPublic)
		pub.GET("/testimonials", cch.Page(ckTestimonials, 5*time.Minute), siteH.ListTestimonialsPublic)

		// Catálogo de cursos (LMS) — público + admin
		lmsH := lms.NewHandler(gdb)
		pub.GET("/courses", cch.Page(ckCourses, 5*time.Minute), lmsH.ListPublic)
		pub.GET("/validate-certificate/:code", lmsH.ValidateCertificate)

		// ─── Asaas (Fase 3 — server-side; chave nunca no browser) ───
		asaasH := asaas.NewHandler(gdb, cfg, ml)
		pub.POST("/checkout", asaasH.Checkout)     // matrícula pelo site
		v1.POST("/webhooks/asaas", asaasH.Webhook) // token-verified
		payGroup := v1.Group("/payments")
		payGroup.Use(middleware.RequireAuth(tm), middleware.RequireRole("admin", "coordenador", "atendente"))
		payGroup.GET("", asaasH.Search) // ?ref= | ?customer= | ?all=true
		payGroup.GET("/:id/status", asaasH.Status)
		payGroup.GET("/:id/pix-qrcode", asaasH.PixQrCode)
		payGroup.POST("/customer", asaasH.Customer)
		payGroup.POST("/create", asaasH.CreateCharge)
		payGroup.POST("/link", asaasH.PaymentLink)
		payGroup.POST("/test-connection", asaasH.TestConnection) // testa chave Asaas server-side

		// ─── Maria Antônia (Fase 4 — webhook WhatsApp/Evolution) ───
		mariaH := maria.NewHandler(gdb, cfg)
		v1.POST("/webhooks/whatsapp", mariaH.Webhook)
		// Config do agente (admin/coordenador) — página /agente-maria.
		mcg := v1.Group("/maria")
		mcg.Use(middleware.RequireAuth(tm), middleware.RequireRole("admin", "coordenador"))
		mcg.GET("/config", mariaH.GetConfig)
		mcg.PUT("/config", mariaH.PutConfig)

		// ─── Gestão do site (auth) ───
		staffRoles := []string{"admin", "coordenador", "atendente"}
		lg := v1.Group("/leads")
		lg.Use(middleware.RequireAuth(tm), middleware.RequireRole(staffRoles...))
		lg.GET("", siteH.ListLeads)
		lg.PUT("/:id", siteH.UpdateLead)
		lg.DELETE("/:id", siteH.DeleteLead)

		cg := v1.Group("/complaints")
		cg.Use(middleware.RequireAuth(tm), middleware.RequireRole(staffRoles...))
		cg.GET("", siteH.ListComplaints)
		cg.PUT("/:id", siteH.UpdateComplaint)
		cg.DELETE("/:id", siteH.DeleteComplaint)

		tg := v1.Group("/testimonials")
		tg.Use(middleware.RequireAuth(tm), middleware.RequireRole(staffRoles...))
		tg.GET("", siteH.ListTestimonialsAdmin)
		tg.POST("", cch.InvalidateOn(ckTestimonials), siteH.CreateTestimonialAdmin)
		tg.PUT("/:id", cch.InvalidateOn(ckTestimonials), siteH.UpdateTestimonial)
		tg.DELETE("/:id", cch.InvalidateOn(ckTestimonials), siteH.DeleteTestimonial)

		eg := v1.Group("/enrollments")
		eg.Use(middleware.RequireAuth(tm), middleware.RequireRole(staffRoles...))
		eg.GET("", siteH.ListEnrollments)
		eg.PUT("/:id", siteH.UpdateEnrollment)
		eg.DELETE("/:id", siteH.DeleteEnrollment)

		// ─── Acadêmico: turmas (classes) + instrutores ───
		acadH := academic.NewHandler(gdb)
		staffOnly := middleware.RequireRole(staffRoles...)
		cl := v1.Group("/classes")
		cl.Use(middleware.RequireAuth(tm))
		// GET liberado a qualquer autenticado; o handler filtra para o aluno
		// ver apenas a própria turma (a Área do Aluno depende disto).
		cl.GET("", acadH.ListClasses)
		// Mutações e leituras administrativas continuam staff-only.
		cl.POST("", staffOnly, cch.InvalidateOn(ckUpcoming), acadH.CreateClass)
		cl.PUT("/:id", staffOnly, cch.InvalidateOn(ckUpcoming), acadH.UpdateClass)
		cl.DELETE("/:id", staffOnly, cch.InvalidateOn(ckUpcoming), acadH.DeleteClass)
		cl.GET("/:id/instructors", staffOnly, acadH.ListClassInstructors)
		cl.POST("/:id/instructors", staffOnly, acadH.AddClassInstructor)
		cl.DELETE("/:id/instructors/:linkId", staffOnly, acadH.RemoveClassInstructor)

		ai := v1.Group("/available-instructors")
		ai.Use(middleware.RequireAuth(tm), middleware.RequireRole(staffRoles...))
		ai.GET("", acadH.AvailableInstructors)

		// ─── Staff (equipe) + Qualificações PR-127 — RBAC admin/coordenador ───
		staffH := staff.NewHandler(gdb)
		sf := v1.Group("/staff")
		sf.Use(middleware.RequireAuth(tm), middleware.RequireRole("admin", "coordenador"))
		sf.GET("", staffH.List)
		sf.POST("", staffH.Create)
		sf.PUT("/:id", staffH.Update)
		sf.DELETE("/:id", staffH.Delete)

		iq := v1.Group("/instructor-qualifications")
		iq.Use(middleware.RequireAuth(tm), middleware.RequireRole(staffRoles...))
		iq.GET("", acadH.ListQualifications)
		iq.POST("", acadH.CreateQualification)
		iq.PUT("/:id", acadH.UpdateQualification)
		iq.DELETE("/:id", acadH.DeleteQualification)

		ia := v1.Group("/instructors")
		ia.Use(middleware.RequireAuth(tm), middleware.RequireRole("admin", "coordenador"))
		ia.GET("/:id/authorizations", acadH.GetInstructorAuthorizations)
		ia.PUT("/:id/authorizations", acadH.PutInstructorAuthorizations)

		att := v1.Group("/attendance")
		att.Use(middleware.RequireAuth(tm))
		att.GET("", acadH.ListAttendance)
		att.POST("", acadH.CreateAttendance)
		att.PUT("/:id", acadH.UpdateAttendance)
		cl.GET("/:id/modules/:moduleId/attendance", acadH.ModuleAttendance)
		cl.PUT("/:id/modules/:moduleId/attendance/:studentId", acadH.SetModuleAttendance)
		cl.GET("/:id/progress", acadH.ClassProgress)
		v1.POST("/modules/:moduleId/attendance/student-confirm", middleware.RequireAuth(tm), acadH.ConfirmModuleAttendance)

		// ─── Chat interno em tempo real (WebSocket) ───
		chatHub := chat.NewHub()
		v1.GET("/ws/chat", chat.ServeWS(tm, chatHub, cfg)) // auth via ?token= (sem middleware)

		// ─── Transversais (orders, messages, comunicados, CMS, upcoming) ───
		miscH := misc.NewHandler(gdb, chatHub)
		pub.GET("/site-content", cch.Page(ckSiteContent, 5*time.Minute), miscH.GetSiteContent) // público (site lê conteúdo)
		pub.GET("/upcoming-classes", cch.Page(ckUpcoming, time.Minute), miscH.PublicUpcomingClasses)

		authAny := v1.Group("")
		authAny.Use(middleware.RequireAuth(tm))
		authAny.GET("/orders", miscH.ListOrders)
		authAny.POST("/orders", miscH.CreateOrder)
		authAny.PUT("/orders/:id", miscH.UpdateOrder)
		authAny.GET("/messages/contacts", miscH.Contacts)
		authAny.GET("/messages", miscH.ListMessages)
		authAny.POST("/messages", miscH.CreateMessage)
		authAny.PUT("/messages/:id/read", miscH.MarkMessageRead)
		authAny.GET("/general-announcements", miscH.ListAnnouncements)
		authAny.GET("/upcoming-classes", miscH.UpcomingClasses)

		mg := v1.Group("")
		mg.Use(middleware.RequireAuth(tm), middleware.RequireRole("admin", "coordenador"))
		mg.POST("/general-announcements", miscH.CreateAnnouncement)
		mg.PUT("/general-announcements/:id", miscH.UpdateAnnouncement)
		mg.DELETE("/general-announcements/:id", miscH.DeleteAnnouncement)
		mg.PUT("/site-content", cch.InvalidateOn(ckSiteContent), miscH.SaveSiteContent)

		// ─── Students (alunos) ───
		studentsH := students.NewHandler(gdb)
		cl.GET("/:id/students", staffOnly, studentsH.ClassStudents)
		st := v1.Group("/students")
		st.Use(middleware.RequireAuth(tm))
		// GET liberado; o handler força o aluno a ver só o próprio cadastro.
		st.GET("", studentsH.List)
		st.POST("", staffOnly, studentsH.Create)
		st.GET("/:id", staffOnly, studentsH.Get)
		// Aluno pode atualizar o próprio cadastro (aceite, docs, contato); o
		// handler valida a posse e restringe os campos. Staff atualiza tudo.
		st.PUT("/:id", middleware.RequireRole("admin", "coordenador", "atendente", "aluno"), studentsH.Update)
		st.DELETE("/:id", staffOnly, studentsH.Delete)

		// ─── Storage (arquivos) ───
		storageH := storage.NewHandler(cfg.StorageDir, cfg.PublicURL)
		up := v1.Group("/upload")
		up.Use(middleware.RequireAuth(tm), middleware.RequireRole(staffRoles...))
		up.POST("", storageH.Upload)
		v1.GET("/files/*path", storageH.Serve) // leitura pública dos arquivos

		// ─── Avaliações (student_evaluations — A1) ───
		ev := v1.Group("/evaluations")
		ev.Use(middleware.RequireAuth(tm))
		evStaff := middleware.RequireRole("admin", "coordenador", "instrutor")
		ev.GET("", acadH.ListEvaluations) // aluno vê apenas as próprias notas
		ev.POST("", evStaff, acadH.CreateEvaluation)
		ev.DELETE("", evStaff, acadH.DeleteEvaluations)

		// ─── Configurações do sistema (C1 — só admin, segredos mascarados) ───
		settingsH := settings.NewHandler(gdb)
		sg := v1.Group("/settings")
		sg.Use(middleware.RequireAuth(tm), middleware.RequireRole("admin", "coordenador"))
		sg.GET("", settingsH.List)
		sg.PUT("", settingsH.Upsert)

		// ─── Auditoria ───
		auditH := audit.NewHandler(gdb)
		ag := v1.Group("/audit")
		ag.Use(middleware.RequireAuth(tm))
		ag.POST("", auditH.Record)
		ag.GET("", middleware.RequireRole("admin", "coordenador"), auditH.List)

		// ─── Financeiro (RBAC admin/coordenador; C4 PIN por hash) ───
		finH := financial.NewHandler(gdb)
		finStaff := middleware.RequireRole("admin", "coordenador")
		fg := v1.Group("/financial")
		fg.Use(middleware.RequireAuth(tm))
		// O aluno vê apenas as próprias parcelas (handler filtra); o resto é staff.
		fg.GET("/records", finH.ListRecords)
		fg.POST("/records", finStaff, finH.CreateRecord)
		fg.PUT("/records/:id", finStaff, finH.UpdateRecord)
		fg.DELETE("/records/:id", finStaff, finH.DeleteRecord)
		fg.GET("/costs", finStaff, finH.ListCosts)
		fg.POST("/costs", finStaff, finH.CreateCost)
		fg.PUT("/costs/:id", finStaff, finH.UpdateCost)
		fg.DELETE("/costs/:id", finStaff, finH.DeleteCost)
		fg.GET("/expenses", finStaff, finH.ListExpenses)
		fg.POST("/expenses", finStaff, finH.CreateExpense)
		fg.PUT("/expenses/:id", finStaff, finH.UpdateExpense)
		fg.DELETE("/expenses/:id", finStaff, finH.DeleteExpense)
		fg.GET("/invoices", finStaff, finH.ListInvoices)
		fg.POST("/invoices", finStaff, finH.CreateInvoice)
		fg.POST("/pin", finStaff, finH.SetPin)
		fg.POST("/pin/verify", finStaff, finH.VerifyPin)

		// ─── Cursos LMS ───
		// GETs de um curso liberados a qualquer autenticado (o aluno matriculado
		// precisa ver a estrutura/aulas); lista completa e mutações são staff.
		cg2 := v1.Group("/courses")
		cg2.Use(middleware.RequireAuth(tm))
		cg2.GET("/:id", lmsH.Get)
		cg2.GET("/:id/structure", lmsH.Structure)
		cg2.GET("/:id/quizzes", lmsH.ListQuizzes)
		cg2.GET("", staffOnly, lmsH.List)
		cg2.POST("", staffOnly, cch.InvalidateOn(ckCourses), lmsH.Create)
		cg2.PUT("/:id", staffOnly, cch.InvalidateOn(ckCourses), lmsH.Update)
		cg2.DELETE("/:id", staffOnly, cch.InvalidateOn(ckCourses), lmsH.Delete)

		// ─── LMS conteúdo (admin/instrutor gerenciam) ───
		lmsAdmin := v1.Group("/lms")
		lmsAdmin.Use(middleware.RequireAuth(tm), middleware.RequireRole("admin", "coordenador", "instrutor"))
		lmsAdmin.POST("/modules", lmsH.CreateModule)
		lmsAdmin.PUT("/modules/:id", lmsH.UpdateModule)
		lmsAdmin.DELETE("/modules/:id", lmsH.DeleteModule)
		lmsAdmin.POST("/lessons", lmsH.CreateLesson)
		lmsAdmin.PUT("/lessons/:id", lmsH.UpdateLesson)
		lmsAdmin.DELETE("/lessons/:id", lmsH.DeleteLesson)
		lmsAdmin.POST("/quizzes", lmsH.CreateQuiz)
		lmsAdmin.PUT("/quizzes/:id", lmsH.UpdateQuiz)
		lmsAdmin.DELETE("/quizzes/:id", lmsH.DeleteQuiz)
		lmsAdmin.POST("/questions", lmsH.CreateQuestion)
		lmsAdmin.PUT("/questions/:id", lmsH.UpdateQuestion)
		lmsAdmin.DELETE("/questions/:id", lmsH.DeleteQuestion)
		lmsAdmin.POST("/certificates", lmsH.IssueCertificate)
		lmsAdmin.POST("/announcements", lmsH.CreateAnnouncement)
		lmsAdmin.PUT("/announcements/:id", lmsH.UpdateAnnouncement)
		lmsAdmin.DELETE("/announcements/:id", lmsH.DeleteAnnouncement)
		lmsAdmin.GET("/question-bank", lmsH.ListQuestionBank)
		lmsAdmin.POST("/question-bank", lmsH.CreateQuestionBank)
		lmsAdmin.DELETE("/question-bank/:id", lmsH.DeleteQuestionBank)
		lmsAdmin.GET("/doubts", lmsH.ListDoubts)
		lmsAdmin.PUT("/doubts/:id", lmsH.AnswerDoubt)

		// ─── LMS aprendizado (qualquer usuário autenticado, incl. aluno) ───
		lmsAuth := v1.Group("/lms")
		lmsAuth.Use(middleware.RequireAuth(tm))
		lmsAuth.GET("/quizzes/:id", lmsH.GetQuiz)
		lmsAuth.GET("/lessons/:id", lmsH.LessonDetail)
		lmsAuth.GET("/courses/:id/lessons", lmsH.CourseLessons)
		lmsAuth.GET("/courses/:id/quizzes", lmsH.ListQuizzes)
		lmsAuth.GET("/task-submissions", lmsH.GetTaskSubmission)
		lmsAuth.POST("/task-submissions", lmsH.UpsertTaskSubmission)
		lmsAuth.POST("/time-logs", lmsH.LogTime)
		lmsAuth.GET("/time-logs", lmsH.ListTimeLogs)
		lmsAuth.GET("/progress", lmsH.ListProgress)
		lmsAuth.POST("/progress", lmsH.UpsertProgress)
		lmsAuth.POST("/quiz-results", lmsH.SubmitQuizResult)
		lmsAuth.GET("/quiz-results", lmsH.ListQuizResults)
		lmsAuth.GET("/announcements", lmsH.ListAnnouncements)
		lmsAuth.GET("/forum-topics", lmsH.AllForumTopics)
		lmsAuth.GET("/lessons/:id/forum", lmsH.LessonForum)
		lmsAuth.GET("/lessons/:id/doubts", lmsH.ListLessonDoubts)
		lmsAuth.POST("/doubts", lmsH.CreateDoubt)
		lmsAuth.POST("/forum/topics", lmsH.CreateTopic)
		lmsAuth.POST("/forum/replies", lmsH.CreateReply)
		lmsAuth.GET("/forum/topics/:id/replies", lmsH.TopicReplies)
		lmsAuth.GET("/certificates", lmsH.ListCertificates)
		lmsAuth.POST("/certificates/claim", lmsH.ClaimCertificate)
		lmsAuth.GET("/my-courses", lmsH.MyCourses)

		// Matrícula EAD (staff matricula/desmatricula alunos em cursos)
		lmsAdmin.POST("/enrollments", lmsH.Enroll)
		lmsAdmin.DELETE("/enrollments", lmsH.Unenroll)
	}

	// ─── Frontend (SPA) servido pela própria API (imagem única) ───
	// Se WEB_DIR estiver setado, serve os arquivos do build do frontend e faz
	// fallback para index.html (React Router). Rotas /api/* não são afetadas.
	if cfg.WebDir != "" {
		index := filepath.Join(cfg.WebDir, "index.html")
		r.NoRoute(func(c *gin.Context) {
			p := c.Request.URL.Path
			if strings.HasPrefix(p, "/api/") {
				c.JSON(http.StatusNotFound, gin.H{"error": "rota não encontrada"})
				return
			}
			// Serve o arquivo estático se existir; senão, o index (SPA).
			clean := filepath.Clean(p)
			file := filepath.Join(cfg.WebDir, clean)
			if strings.HasPrefix(file, cfg.WebDir) {
				if fi, err := os.Stat(file); err == nil && !fi.IsDir() {
					if strings.HasPrefix(clean, "/assets/") {
						c.Header("Cache-Control", "public, max-age=31536000, immutable")
					}
					c.File(file)
					return
				}
			}
			c.Header("Cache-Control", "no-cache, must-revalidate")
			c.File(index)
		})
	}

	return r
}
