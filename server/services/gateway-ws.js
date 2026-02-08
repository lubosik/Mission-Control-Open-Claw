import WebSocket from 'ws';

let gatewayWs = null;
let reconnectTimer = null;
const GATEWAY_URL = 'ws://127.0.0.1:63362';

export function connectToGateway(onMessage) {
  if (gatewayWs?.readyState === WebSocket.OPEN) {
    return gatewayWs;
  }

  console.log('🔌 Connecting to OpenClaw Gateway:', GATEWAY_URL);
  
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
