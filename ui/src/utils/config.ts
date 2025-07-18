// Configuration for the Lite IDE UI
export const config = {
  // API endpoint for backend communication
  apiEndpoint: process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://localhost:3000',
  
  // WebSocket host for terminal connections
  wsHost: process.env.NEXT_PUBLIC_WS_HOST || 'ws://localhost:3000',
  
  // Panel visibility flags
  showEditor: true,
  showTerminal: true,
} as const

// Type for the config
export type Config = typeof config
