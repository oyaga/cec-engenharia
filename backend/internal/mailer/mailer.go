// Package mailer envia e-mails transacionais via API HTTP do Resend.
// Fica inerte (no-op) quando RESEND_API_KEY não está configurada, para que
// os fluxos funcionem em dev/produção sem e-mail até o provedor ser ligado.
package mailer

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

const resendEndpoint = "https://api.resend.com/emails"

// Mailer envia e-mails. Se apiKey == "" todos os envios viram no-op logado.
type Mailer struct {
	apiKey string
	from   string // ex.: "CEC Engenharia <nao-responda@cursocec.com.br>"
	client *http.Client
}

// New cria um Mailer. from é o remetente padrão.
func New(apiKey, from string) *Mailer {
	return &Mailer{
		apiKey: apiKey,
		from:   from,
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

// Enabled indica se há provedor configurado.
func (m *Mailer) Enabled() bool { return m.apiKey != "" }

type resendPayload struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
	ReplyTo string   `json:"reply_to,omitempty"`
}

// Send envia um e-mail HTML. Retorna erro apenas em falhas reais de envio;
// quando o provedor está desligado, loga e retorna nil.
func (m *Mailer) Send(ctx context.Context, to []string, subject, html string) error {
	if !m.Enabled() {
		log.Printf("[mailer] RESEND_API_KEY ausente — e-mail NÃO enviado (to=%v, subject=%q)", to, subject)
		return nil
	}
	body, _ := json.Marshal(resendPayload{From: m.from, To: to, Subject: subject, HTML: html})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, resendEndpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+m.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := m.client.Do(req)
	if err != nil {
		return fmt.Errorf("mailer: falha na requisição: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return fmt.Errorf("mailer: resend respondeu %d: %s", resp.StatusCode, string(b))
	}
	return nil
}

// SendAsync dispara o envio em background (fire-and-forget), logando erros.
// Útil para não atrasar/《vazar timing》 em respostas HTTP.
func (m *Mailer) SendAsync(to []string, subject, html string) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()
		if err := m.Send(ctx, to, subject, html); err != nil {
			log.Printf("[mailer] erro ao enviar (subject=%q): %v", subject, err)
		}
	}()
}
