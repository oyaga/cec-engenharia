// Cliente WebSocket único do chat em tempo real (/ws/chat).
// Reutilizável por qualquer tela (aluno, instrutor, secretaria): conecta uma vez,
// reconecta com backoff, e entrega as mensagens recebidas aos assinantes.
import { API_BASE, getToken } from './api';

let ws = null;
let reconnectTimer = null;
let attempt = 0;
let intentionalClose = false;
const messageListeners = new Set();
const statusListeners = new Set();

function socketUrl() {
  const base = API_BASE.startsWith('http')
    ? API_BASE.replace(/^http/, 'ws')
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${API_BASE}`;
  return `${base}/ws/chat?token=${encodeURIComponent(getToken() || '')}`;
}

function emitStatus(connected) {
  statusListeners.forEach((fn) => { try { fn(connected); } catch { /* noop */ } });
}

function open() {
  if (!getToken()) return;
  intentionalClose = false;
  try {
    ws = new WebSocket(socketUrl());
  } catch {
    return;
  }

  ws.onopen = () => { attempt = 0; emitStatus(true); };

  ws.onmessage = (ev) => {
    let data;
    try { data = JSON.parse(ev.data); } catch { return; }
    messageListeners.forEach((fn) => { try { fn(data); } catch { /* noop */ } });
  };

  ws.onclose = () => {
    emitStatus(false);
    if (intentionalClose) return;
    attempt += 1;
    reconnectTimer = setTimeout(open, Math.min(1000 * attempt, 10000));
  };

  ws.onerror = () => { try { ws.close(); } catch { /* noop */ } };
}

// Garante uma conexão ativa (idempotente).
export function connectSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  open();
}

export function disconnectSocket() {
  intentionalClose = true;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (ws) { try { ws.close(); } catch { /* noop */ } ws = null; }
}

// Assina o recebimento de eventos ({ type, message, ... }). Retorna o cancelador.
export function onSocketMessage(fn) {
  messageListeners.add(fn);
  return () => messageListeners.delete(fn);
}

// Assina mudanças de status da conexão (true/false). Retorna o cancelador.
export function onSocketStatus(fn) {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

export function isSocketConnected() {
  return !!ws && ws.readyState === WebSocket.OPEN;
}
