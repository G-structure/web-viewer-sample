/**
 * Synth Control Plane - Session Configuration
 *
 * Parses the session token from the URL path and provides connection config.
 *
 * URL format: https://wagmi.cyberneticphysics.com/{base64url-encoded-token}
 *
 * Token format (JSON):
 * {
 *   "v": 1,
 *   "sessionId": "sess_xxx",
 *   "vpnIp": "10.8.0.10",
 *   "streamPort": 49100,
 *   "udpPort": 47998,
 *   "webrtcPort": 0
 * }
 */

export interface SessionToken {
  v: number;
  sessionId: string;
  vpnIp: string;
  streamPort: number;
  udpPort: number;
  webrtcPort?: number;
}

export interface SynthConfig {
  // API endpoint for signaling proxy
  apiBaseUrl: string;
  // TURN server config
  turnServer: string;
  turnUsername: string;
  turnPassword: string;
}

// Default config - can be overridden via environment
export const defaultConfig: SynthConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'https://api.cyberneticphysics.com',
  turnServer: import.meta.env.VITE_TURN_SERVER || 'turn:134.199.177.107:3478',
  turnUsername: import.meta.env.VITE_TURN_USERNAME || 'isaac',
  turnPassword: import.meta.env.VITE_TURN_PASSWORD || '',
};

/**
 * Decode base64url to string
 */
function base64UrlDecode(str: string): string {
  // Convert base64url to base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Pad with = if necessary
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  return atob(base64);
}

/**
 * Parse session token from URL path
 */
export function parseSessionToken(): SessionToken | null {
  const path = window.location.pathname;
  // Remove leading slash and get token
  const token = path.slice(1);

  if (!token) {
    console.error('No session token in URL path');
    return null;
  }

  try {
    const decoded = base64UrlDecode(token);
    const parsed = JSON.parse(decoded) as SessionToken;

    // Validate required fields
    if (!parsed.sessionId || !parsed.vpnIp || !parsed.streamPort) {
      console.error('Invalid session token: missing required fields');
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse session token:', error);
    return null;
  }
}

/**
 * Get signaling proxy URL for a session
 * The API proxies WebSocket/HTTP signaling to the VPN IP
 */
export function getSignalingProxyUrl(config: SynthConfig, session: SessionToken): string {
  return `${config.apiBaseUrl}/v1/stream/${session.sessionId}/signal`;
}

/**
 * Get ICE servers config (STUN + TURN)
 */
export function getIceServers(config: SynthConfig): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    // Google's public STUN server
    { urls: 'stun:stun.l.google.com:19302' },
  ];

  // Add TURN server if password is configured
  if (config.turnPassword) {
    servers.push({
      urls: config.turnServer,
      username: config.turnUsername,
      credential: config.turnPassword,
    });
  }

  return servers;
}
