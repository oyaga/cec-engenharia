package asaas

import (
	"crypto/rand"
	"encoding/hex"
	"html"
	"log"
	"strings"
	"time"

	"github.com/PITICALYN/cec-backend/internal/auth"
	"github.com/PITICALYN/cec-backend/internal/models"
	"github.com/google/uuid"
)

// welcomeTokenTTL — validade do link de primeiro acesso no e-mail de boas-vindas.
const welcomeTokenTTL = 72 * time.Hour

func onlyDigits(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func randomSecret() string {
	buf := make([]byte, 16)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}

// activateStudent transforma uma pré-matrícula paga num aluno com acesso ao
// EAD, de forma automática e idempotente. A secretaria pode revisar/corrigir
// depois em /alunos (nada aqui bloqueia edições posteriores).
//
// Passos: cria/encontra o usuário (login), resolve a turma pelo nome do curso
// (preferindo a que tem curso EAD vinculado), cria/vincula o cadastro de aluno
// com acesso liberado e dispara o e-mail de boas-vindas. Marca a matrícula como
// processada para não repetir em reenvios do webhook.
func (h *Handler) activateStudent(enr *models.Enrollment) {
	if enr.ProcessedAt != nil {
		return // já ativado
	}
	if enr.Email == nil || strings.TrimSpace(*enr.Email) == "" {
		log.Printf("[asaas] matrícula %s sem e-mail — ativação adiada para a secretaria", enr.ID)
		return
	}
	email := strings.ToLower(strings.TrimSpace(*enr.Email))
	cpf := ""
	if enr.CPF != nil {
		cpf = strings.TrimSpace(*enr.CPF)
	}

	// 1) Usuário (login). Senha inicial = CPF (dígitos) como no resto do sistema;
	//    sem CPF, um segredo aleatório — em ambos os casos exige troca no 1º acesso.
	var user models.User
	if err := h.db.Where("LOWER(email) = ?", email).First(&user).Error; err != nil {
		pw := onlyDigits(cpf)
		if len(pw) < 6 {
			pw = randomSecret()
		}
		hash, herr := auth.HashPassword(pw)
		if herr != nil {
			log.Printf("[asaas] falha ao gerar senha para %s: %v", email, herr)
			return
		}
		user = models.User{
			Email:              email,
			PasswordHash:       hash,
			FullName:           enr.Name,
			Role:               "aluno",
			IsActive:           true,
			MustChangePassword: true,
		}
		if cpf != "" {
			user.CPF = &cpf
		}
		if enr.Phone != "" {
			p := enr.Phone
			user.Phone = &p
		}
		if err := h.db.Create(&user).Error; err != nil {
			log.Printf("[asaas] falha ao criar usuário %s: %v", email, err)
			return
		}
	}

	// 2) Turma: preserva a reserva enquanto houver vaga. Se a turma tiver sido
	//    preenchida manualmente durante o pagamento, avança para a próxima.
	var turma models.Class
	var turmaID *uuid.UUID
	var candidates []models.Class
	classQuery := h.db.Where("start_date >= CURRENT_DATE OR is_immediate_start = ?", true).
		Order("start_date ASC NULLS FIRST, created_at ASC")
	if enr.TurmaID != nil {
		var reserved models.Class
		if h.db.First(&reserved, "id = ?", *enr.TurmaID).Error == nil {
			candidates = append(candidates, reserved)
			if reserved.LMSCourseID != nil {
				classQuery = classQuery.Where("lms_course_id = ? AND id <> ?", *reserved.LMSCourseID, reserved.ID)
			} else {
				classQuery = classQuery.Where("course_name = ? AND id <> ?", reserved.CourseName, reserved.ID)
			}
		}
	} else {
		classQuery = classQuery.Where("course_name = ?", enr.CourseName)
	}
	var alternatives []models.Class
	classQuery.Find(&alternatives)
	candidates = append(candidates, alternatives...)
	for _, candidate := range candidates {
		capacity := candidate.MaxCapacity
		if capacity <= 0 {
			capacity = 10
		}
		var active, reservations int64
		h.db.Model(&models.Student{}).Where("turma_id = ? AND status <> ?", candidate.ID, "cancelada").Count(&active)
		h.db.Model(&models.Enrollment{}).
			Where("turma_id = ? AND id <> ? AND ((status IN ? AND created_at >= ?) OR (status = ? AND processed_at IS NULL))",
				candidate.ID, enr.ID, []string{"pending", "pending_payment", "pendente"}, time.Now().Add(-30*time.Minute), "paid").
			Count(&reservations)
		if active+reservations < int64(capacity) {
			turma = candidate
			id := candidate.ID
			turmaID = &id
			break
		}
	}
	if turmaID == nil {
		log.Printf("[asaas] nenhuma turma para o curso %q — aluno criado sem turma (secretaria vincula)", enr.CourseName)
		h.db.Model(enr).Updates(map[string]any{"turma_id": nil, "status": "paid_waiting_class"})
		enr.TurmaID = nil
		enr.Status = "paid_waiting_class"
	} else if enr.TurmaID == nil || *enr.TurmaID != *turmaID {
		h.db.Model(enr).Update("turma_id", *turmaID)
		enr.TurmaID = turmaID
	}

	// 3) Cadastro de aluno — cria ou vincula (CPF é único).
	var student models.Student
	q := h.db.Where("user_id = ?", user.ID)
	if cpf != "" {
		q = h.db.Where("user_id = ? OR cpf = ?", user.ID, cpf)
	}
	if err := q.First(&student).Error; err != nil {
		student = models.Student{
			UserID:                 &user.ID,
			FullName:               enr.Name,
			CPF:                    cpf,
			Email:                  enr.Email,
			TurmaID:                turmaID,
			HasLMSAccess:           true,
			Status:                 "ativa",
			RequiresPasswordChange: true,
		}
		if enr.Phone != "" {
			p := enr.Phone
			student.Phone = &p
		}
		if err := h.db.Create(&student).Error; err != nil {
			log.Printf("[asaas] falha ao criar aluno (cpf=%s): %v", cpf, err)
			return
		}
	} else {
		updates := map[string]any{"has_lms_access": true}
		if student.UserID == nil {
			updates["user_id"] = user.ID
		}
		if turmaID != nil && student.TurmaID == nil {
			updates["turma_id"] = *turmaID
		}
		h.db.Model(&student).Updates(updates)
	}

	// 4) Marca processada (idempotência) e envia boas-vindas.
	now := time.Now()
	h.db.Model(enr).Update("processed_at", now)
	h.sendWelcome(&user)
	log.Printf("[asaas] aluno ativado automaticamente: %s (turma=%v)", email, turmaID)
}

// sendWelcome envia o e-mail de boas-vindas com link de primeiro acesso.
func (h *Handler) sendWelcome(user *models.User) {
	if h.ml == nil || !h.ml.Enabled() || user.Email == "" {
		return
	}
	token, err := auth.IssueResetToken(h.db, user.ID, welcomeTokenTTL)
	if err != nil {
		return
	}
	link := strings.TrimRight(h.publicURL, "/") + "/redefinir-senha?token=" + token
	name := html.EscapeString(strings.TrimSpace(user.FullName))
	if name == "" {
		name = "bem-vindo(a)"
	}
	body := `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">` +
		`<h2 style="color:#0f172a;margin:0 0 16px">CEC Engenharia</h2>` +
		`<p>Olá, ` + name + `.</p>` +
		`<p>Sua matrícula foi confirmada e o seu acesso ao portal do aluno já está liberado! Para começar, defina a sua senha clicando no botão abaixo (o link vale por 3 dias):</p>` +
		`<p style="text-align:center;margin:28px 0"><a href="` + link + `" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block">Definir minha senha</a></p>` +
		`<p style="font-size:13px;color:#6b7280">Seu login é o e-mail <b>` + html.EscapeString(user.Email) + `</b>.</p>` +
		`<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">` +
		`<p style="font-size:12px;color:#9ca3af">Este é um e-mail automático — não responda.</p></div>`
	h.ml.SendAsync([]string{user.Email}, "Matrícula confirmada — acesse o portal da CEC Engenharia", body)
}
