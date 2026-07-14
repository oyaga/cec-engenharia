// Package asaas concentra a integração com o gateway Asaas — SERVER-SIDE.
// A chave nunca vai ao browser (corrige C2): fica em system_settings/env e só
// é usada aqui. O frontend chama os endpoints /payments/* do nosso backend.
package asaas

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/PITICALYN/cec-backend/internal/config"
	"github.com/PITICALYN/cec-backend/internal/models"
	"gorm.io/gorm"
)

type Client struct {
	db  *gorm.DB
	cfg *config.Config
	http *http.Client
}

func NewClient(db *gorm.DB, cfg *config.Config) *Client {
	return &Client{db: db, cfg: cfg, http: &http.Client{Timeout: 20 * time.Second}}
}

// creds resolve a chave/ambiente: prioridade para system_settings, fallback env.
func (c *Client) creds() (key, baseURL string, err error) {
	settings := map[string]string{}
	var rows []models.SystemSetting
	c.db.Where("key IN ?", []string{"asaas_api_key", "asaas_environment"}).Find(&rows)
	for _, r := range rows {
		if r.Value != nil {
			settings[r.Key] = *r.Value
		}
	}
	key = settings["asaas_api_key"]
	if key == "" {
		key = c.cfg.AsaasAPIKey
	}
	env := settings["asaas_environment"]
	if env == "" {
		env = c.cfg.AsaasEnv
	}
	if key == "" {
		return "", "", errors.New("chave do Asaas não configurada")
	}
	if env == "production" {
		return key, "https://api.asaas.com/api/v3", nil
	}
	return key, "https://sandbox.asaas.com/api/v3", nil
}

// do executa uma chamada autenticada à API do Asaas.
func (c *Client) do(method, endpoint string, body any) (map[string]any, int, error) {
	key, baseURL, err := c.creds()
	if err != nil {
		return nil, 0, err
	}
	var buf io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		buf = bytes.NewReader(b)
	}
	req, err := http.NewRequest(method, baseURL+endpoint, buf)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("access_token", key)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	var parsed map[string]any
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &parsed)
	}
	if resp.StatusCode >= 400 {
		msg := fmt.Sprintf("Asaas HTTP %d", resp.StatusCode)
		if parsed != nil {
			if errs, ok := parsed["errors"].([]any); ok && len(errs) > 0 {
				if m, ok := errs[0].(map[string]any); ok {
					if d, ok := m["description"].(string); ok {
						msg = d
					}
				}
			}
		}
		return parsed, resp.StatusCode, errors.New(msg)
	}
	return parsed, resp.StatusCode, nil
}

// CreateOrFindCustomer cria (ou reaproveita) um cliente no Asaas por CPF.
func (c *Client) CreateOrFindCustomer(name, cpf, email, phone, externalRef string) (map[string]any, error) {
	if found, _, err := c.do("GET", "/customers?cpfCnpj="+cpf, nil); err == nil {
		if data, ok := found["data"].([]any); ok && len(data) > 0 {
			if cust, ok := data[0].(map[string]any); ok {
				return cust, nil
			}
		}
	}
	cust, _, err := c.do("POST", "/customers", map[string]any{
		"name": name, "cpfCnpj": cpf, "email": email,
		"mobilePhone": phone, "externalReference": externalRef,
	})
	return cust, err
}

// CreatePayment cria uma cobrança (billingType: PIX|BOLETO|CREDIT_CARD|UNDEFINED).
func (c *Client) CreatePayment(payload map[string]any) (map[string]any, error) {
	res, _, err := c.do("POST", "/payments", payload)
	return res, err
}

// CreatePaymentLink cria um link de pagamento avulso.
func (c *Client) CreatePaymentLink(payload map[string]any) (map[string]any, error) {
	res, _, err := c.do("POST", "/paymentLinks", payload)
	return res, err
}

// GetPayment consulta uma cobrança.
func (c *Client) GetPayment(id string) (map[string]any, error) {
	res, _, err := c.do("GET", "/payments/"+id, nil)
	return res, err
}

// GetPixQrCode retorna o QR Code PIX de uma cobrança.
func (c *Client) GetPixQrCode(id string) (map[string]any, error) {
	res, _, err := c.do("GET", "/payments/"+id+"/pixQrCode", nil)
	return res, err
}

// ListByCustomer lista cobranças de um cliente.
func (c *Client) ListByCustomer(customerID string) (map[string]any, error) {
	res, _, err := c.do("GET", "/payments?customer="+customerID, nil)
	return res, err
}

// ListPaymentsByRef busca cobranças por externalReference.
func (c *Client) ListPaymentsByRef(ref string) (map[string]any, error) {
	res, _, err := c.do("GET", "/payments?externalReference="+ref, nil)
	return res, err
}

// ListAll lista as últimas cobranças (para sincronização).
func (c *Client) ListAll(limit int) (map[string]any, error) {
	res, _, err := c.do("GET", fmt.Sprintf("/payments?limit=%d", limit), nil)
	return res, err
}
