// Package chat implementa o chat interno em tempo real (WebSocket).
// Envio de mensagem continua via HTTP (persiste no banco); o hub apenas
// empurra a mensagem persistida para as conexões abertas do remetente e do
// destinatário, substituindo o polling do frontend.
package chat

import (
	"sync"

	"github.com/google/uuid"
)

// Client é uma conexão WebSocket ativa de um usuário.
type Client struct {
	userID uuid.UUID
	send   chan []byte
}

// Hub mantém as conexões WS por usuário (em memória, processo único).
type Hub struct {
	mu      sync.RWMutex
	clients map[uuid.UUID]map[*Client]bool
}

func NewHub() *Hub {
	return &Hub{clients: make(map[uuid.UUID]map[*Client]bool)}
}

func (h *Hub) register(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.clients[c.userID] == nil {
		h.clients[c.userID] = make(map[*Client]bool)
	}
	h.clients[c.userID][c] = true
}

func (h *Hub) unregister(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if set, ok := h.clients[c.userID]; ok {
		if _, ok := set[c]; ok {
			delete(set, c)
			close(c.send)
			if len(set) == 0 {
				delete(h.clients, c.userID)
			}
		}
	}
}

// SendToUsers entrega o payload a todas as conexões dos usuários informados.
// Não bloqueia: se o buffer de um cliente estiver cheio, descarta (cliente lento).
func (h *Hub) SendToUsers(payload []byte, userIDs ...uuid.UUID) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	seen := map[uuid.UUID]bool{}
	for _, uid := range userIDs {
		if uid == uuid.Nil || seen[uid] {
			continue
		}
		seen[uid] = true
		for c := range h.clients[uid] {
			select {
			case c.send <- payload:
			default:
			}
		}
	}
}

// OnlineUserIDs devolve os IDs dos usuários com pelo menos uma conexão ativa.
func (h *Hub) OnlineUserIDs() []uuid.UUID {
	h.mu.RLock()
	defer h.mu.RUnlock()
	out := make([]uuid.UUID, 0, len(h.clients))
	for uid := range h.clients {
		out = append(out, uid)
	}
	return out
}
