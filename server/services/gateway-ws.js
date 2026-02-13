import WebSocket from 'ws';

let gatewayWs = null;
let reconnectTimer = null;

// Configurable via env: OPENCLAW_GATEWAY_WS_URL, OPENCLAW_GATEWAY_TOKEN
const baseUrl = process.env.OPENCLAW_GATEWAY_WS_URL || 'ws://127.0.0.1:63362';
const token = process.env.OPENCLAW_GATEWAY_TOKEN;
const GATEWAY_URL = token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;

export function connectToGateway(onMessage) {
  // Skip on Vercel - serverless has no persistent WebSocket
  if (process.env.VERCEL === '1') {
    console.log('⚠️  Gateway WebSocket skipped (Vercel serverless)');
    return null;
  }

  if (gatewayWs?.readyState === WebSocket.OPEN) {
    return gatewayWs;
  }

  console.log('🔌 Connecting to OpenClaw Gateway:', baseUrl);
  gatewayWs = new WebSocket(GATEWAY_URL);

  gatewayWs.on('open', () => {
    console.log('✅ Connected to Gateway WebSocket');
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  });

  gatewayWs.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      if (onMessage) onMessage(message);
    } catch (err) {
      console.error('Failed to parse Gateway message:', err);
    }
  });

  gatewayWs.on('error', (err) => {
    console.error('❌ Gateway WebSocket error:', err.message);
  });

  gatewayWs.on('close', () => {
    console.log('⚠️  Gateway WebSocket closed. Reconnecting in 5s...');
    reconnectTimer = setTimeout(() => connectToGateway(onMessage), 5000);
  });

  return gatewayWs;
}

export function getGatewayConnection() {
  return gatewayWs;
}
