package models

import "time"

// Atendimento — estado de handoff humano por sessão (WhatsApp).
type Atendimento struct {
	SessionID     string    `gorm:"column:session_id;primaryKey" json:"session_id"`
	Status        string    `gorm:"not null;default:bot" json:"status"`
	NomeCliente   *string   `gorm:"column:nome_cliente" json:"nome_cliente,omitempty"`
	UltimoContato time.Time `gorm:"column:ultimo_contato" json:"ultimo_contato"`
}

func (Atendimento) TableName() string { return "atendimentos" }

// MariaMessage — histórico de conversa por sessão (memória do agente).
type MariaMessage struct {
	ID        int64     `gorm:"primaryKey" json:"id"`
	SessionID string    `gorm:"column:session_id;index" json:"session_id"`
	Role      string    `gorm:"not null" json:"role"` // user | assistant
	Content   string    `gorm:"not null" json:"content"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
}

func (MariaMessage) TableName() string { return "maria_messages" }
