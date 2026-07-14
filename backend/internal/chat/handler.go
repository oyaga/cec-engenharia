package chat

import (
	"net/http"
	"time"

	"github.com/PITICALYN/cec-backend/internal/auth"
	"github.com/PITICALYN/cec-backend/internal/config"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = 50 * time.Second
)

// ServeWS: GET /ws/chat?token=<jwt>
// O navegador não envia header Authorization em WebSocket, então o token JWT
// vem na query string e é validado antes do upgrade.
func ServeWS(tm *auth.TokenManager, hub *Hub, cfg *config.Config) gin.HandlerFunc {
	allowed := map[string]bool{}
	for _, o := range cfg.CORSOrigins {
		allowed[o] = true
	}
	upgrader := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			if origin == "" {
				return true // cliente não-navegador
			}
			if allowed[origin] {
				return true
			}
			return origin == "http://"+r.Host || origin == "https://"+r.Host
		},
	}

	return func(c *gin.Context) {
		claims, err := tm.Parse(c.Query("token"))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "token inválido"})
			return
		}
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			return // o upgrader já respondeu o erro
		}
		client := &Client{userID: claims.UserID, send: make(chan []byte, 32)}
		hub.register(client)
		go client.writePump(conn)
		client.readPump(conn, hub)
	}
}

// readPump mantém a conexão viva e detecta desconexão. Mensagens vindas do
// cliente são ignoradas (o envio real é via HTTP POST /messages).
func (c *Client) readPump(conn *websocket.Conn, hub *Hub) {
	defer func() {
		hub.unregister(c)
		conn.Close()
	}()
	conn.SetReadLimit(4096)
	_ = conn.SetReadDeadline(time.Now().Add(pongWait))
	conn.SetPongHandler(func(string) error {
		_ = conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}
}

// writePump envia os payloads do hub e faz ping periódico.
func (c *Client) writePump(conn *websocket.Conn) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		conn.Close()
	}()
	for {
		select {
		case msg, ok := <-c.send:
			_ = conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			_ = conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
