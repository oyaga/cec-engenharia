package maria

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"
)

// SendText envia uma mensagem de texto via Evolution API.
// serverURL/instance/apikey vêm do próprio webhook recebido (como no fluxo n8n).
func SendText(serverURL, instance, apikey, number, text string) error {
	if serverURL == "" || instance == "" {
		return nil // sem destino configurado — no-op (dev/sem credenciais)
	}
	body, _ := json.Marshal(map[string]any{"number": number, "text": text})
	req, err := http.NewRequest("POST", serverURL+"/message/sendText/"+instance, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", apikey)
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	resp.Body.Close()
	return nil
}
