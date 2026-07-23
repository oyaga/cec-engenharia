package misc

import (
	"net/http"

	"github.com/PITICALYN/cec-backend/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type contactRow struct {
	ID       uuid.UUID `json:"id"`
	FullName string    `json:"full_name"`
	Role     string    `json:"role"`
}

type chatClassRow struct {
	ID         uuid.UUID `json:"id"`
	Name       string    `json:"name"`
	CourseName string    `json:"course_name"`
}

// Contacts: GET /messages/contacts — pessoas que o usuário logado pode contatar,
// agrupadas em alunos / professores / secretaria, mais quem está online agora.
// O escopo depende do papel (privacidade): o aluno vê colegas da própria turma;
// o instrutor vê seus alunos; o staff vê todos os alunos.
func (h *Handler) Contacts(c *gin.Context) {
	me := middleware.UserID(c)
	role := middleware.Role(c)
	staffRoles := []string{"admin", "coordenador", "atendente", "administrativo"}

	professores := []contactRow{}
	secretaria := []contactRow{}
	alunos := []contactRow{}
	turmas := []chatClassRow{}

	// Secretaria = equipe interna (exceto eu).
	h.db.Table("users").Select("id, full_name, role").
		Where("role IN ? AND is_active = true AND id <> ?", staffRoles, me).
		Order("full_name").Scan(&secretaria)

	// Professores não conversam entre si; alunos e Secretaria podem procurá-los.
	if role != "instrutor" {
		h.db.Table("users").Select("id, full_name, role").
			Where("role = 'instrutor' AND is_active = true AND id <> ?", me).
			Order("full_name").Scan(&professores)
	}

	// Alunos: depende de quem pergunta.
	switch role {
	case "aluno":
		// Colegas de turma.
		h.db.Table("users u").
			Select("DISTINCT u.id, u.full_name, u.role").
			Joins("JOIN students s2 ON s2.user_id = u.id").
			Joins("JOIN students s1 ON s1.turma_id = s2.turma_id").
			Where("s1.user_id = ? AND s2.user_id <> ? AND u.is_active = true", me, me).
			Order("u.full_name").Scan(&alunos)
		h.db.Table("classes c").
			Select("DISTINCT c.id, c.name, c.course_name").
			Joins("JOIN students s ON s.turma_id = c.id").
			Where("s.user_id = ?", me).
			Order("c.name").Scan(&turmas)
	case "instrutor":
		// Alunos das turmas que o instrutor leciona.
		h.db.Table("users u").
			Select("DISTINCT u.id, u.full_name, u.role").
			Joins("JOIN students s ON s.user_id = u.id").
			Joins("JOIN class_instructors ci ON ci.class_id = s.turma_id").
			Where("ci.user_id = ? AND u.is_active = true", me).
			Order("u.full_name").Scan(&alunos)
		h.db.Table("classes c").
			Select("DISTINCT c.id, c.name, c.course_name").
			Joins("JOIN class_instructors ci ON ci.class_id = c.id").
			Where("ci.user_id = ?", me).
			Order("c.name").Scan(&turmas)
	default:
		// Staff vê todos os alunos.
		h.db.Table("users").Select("id, full_name, role").
			Where("role = 'aluno' AND is_active = true AND id <> ?", me).
			Order("full_name").Scan(&alunos)
		h.db.Table("classes").
			Select("id, name, course_name").
			Where("COALESCE(status, '') <> 'arquivada'").
			Order("name").Scan(&turmas)
	}

	online := []string{}
	if h.hub != nil {
		for _, id := range h.hub.OnlineUserIDs() {
			online = append(online, id.String())
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"professores": professores,
		"secretaria":  secretaria,
		"alunos":      alunos,
		"turmas":      turmas,
		"online":      online,
	})
}
