// Configuration for the Lite IDE UI
export function getWsHost() {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    return process.env.NEXT_PUBLIC_WS_HOST || `${protocol}://${host}${port}`;
  }
  return process.env.NEXT_PUBLIC_WS_HOST || '';
}

export const config = {
  // API endpoint for backend communication
  apiEndpoint: process.env.NEXT_PUBLIC_API_ENDPOINT || '',
  
  // WebSocket host for terminal connections
  wsHost: getWsHost(),
  // Panel visibility flags
  showEditor: true,
  showTerminal: true,
} as const

// Type for the config
export type Config = typeof config
