/**
 * Synth Control Plane - Session Configuration
 *
 * Parses the session token from the URL path and provides connection config.
 *
 * URL format: https://wagmi.cyberneticphysics.com/{base64url-payload}.{signature}
 *
 * Token payload (JSON):
 * {
 *   "v": 1,
 *   "sessionId": "sess_xxx",
 *   "vpnIp": "10.8.0.10",
 *   "streamPort": 49100,
 *   "udpPort": 47998,
 *   "webrtcPort": 0,
 *   "exp": 1234567890  // Unix timestamp (seconds)
 * }
 *
 * The signature is HMAC-SHA256 of the payload, verified server-side.
 */

export interface SessionToken {
  v: number;
  sessionId: string;
  vpnIp: string;
  streamPort: number;
  udpPort: number;
  webrtcPort?: number;
  exp?: number;  // Expiration timestamp (Unix seconds)
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
  // TURN server on VPS (157.245.252.180) for WebRTC relay to VPN IPs
  turnServer: import.meta.env.VITE_TURN_SERVER || 'turn:157.245.252.180:3478',
  turnUsername: import.meta.env.VITE_TURN_USERNAME || 'isaac',
  turnPassword: import.meta.env.VITE_TURN_PASSWORD || 'qjRuvE6x0zEc45dtJ11cynRY',
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

export interface TokenParseResult {
  token: SessionToken | null;
  error: string | null;
  expired: boolean;
}

/**
 * Parse session token from URL path
 * Handles both signed (payload.signature) and unsigned (payload) formats
 */
export function parseSessionToken(): TokenParseResult {
  const path = window.location.pathname;
  // Remove leading slash and get token
  const fullToken = path.slice(1);

  if (!fullToken) {
    return { token: null, error: 'No session token in URL path', expired: false };
  }

  try {
    // Split payload and signature (format: payload.signature or just payload)
    const dotIndex = fullToken.lastIndexOf('.');
    const payload = dotIndex > 0 ? fullToken.slice(0, dotIndex) : fullToken;
    // Note: signature is verified server-side, client just needs the payload

    const decoded = base64UrlDecode(payload);
    const parsed = JSON.parse(decoded) as SessionToken;

    // Validate required fields
    if (!parsed.sessionId || !parsed.vpnIp || !parsed.streamPort) {
      return { token: null, error: 'Invalid session token: missing required fields', expired: false };
    }

    // Check expiration
    if (parsed.exp) {
      const now = Math.floor(Date.now() / 1000);
      if (now > parsed.exp) {
        return {
          token: parsed,
          error: 'Session link has expired. Please get a new viewer link from your session.',
          expired: true
        };
      }
    }

    return { token: parsed, error: null, expired: false };
  } catch (error) {
    console.error('Failed to parse session token:', error);
    return { token: null, error: 'Invalid session token format', expired: false };
  }
}

/**
 * Get signaling proxy config for a session
 * The VPS (api.cyberneticphysics.com) proxies WebSocket signaling to the VPN IP
 *
 * Returns the server, port, and path for the signaling connection.
 * This allows HTTPS clients to connect via WSS to the public proxy,
 * which forwards to the internal VPN address.
 */
export function getSignalingProxy(config: SynthConfig, session: SessionToken): {
  server: string;
  port: number;
  path: string;
} {
  const url = new URL(config.apiBaseUrl);
  return {
    server: url.hostname,
    port: url.protocol === 'https:' ? 443 : 80,
    path: `/v1/stream/${session.vpnIp}`,
  };
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
