/**
 * Synth Control Plane - Isaac Sim Viewer
 *
 * Simplified viewer for Isaac Sim sessions accessed via control plane.
 */
import { Component } from 'react';
import { AppStreamer, StreamEvent, StreamProps, DirectConfig, StreamType } from '@nvidia/omniverse-webrtc-streaming-library';
import { parseSessionToken, defaultConfig, SessionToken, SynthConfig, getIceServers } from './config';
import './SynthViewer.css';

interface ViewerState {
  status: 'loading' | 'connecting' | 'connected' | 'error';
  error: string | null;
  session: SessionToken | null;
}

export default class SynthViewer extends Component<{}, ViewerState> {
  private config: SynthConfig = defaultConfig;

  constructor(props: {}) {
    super(props);
    this.state = {
      status: 'loading',
      error: null,
      session: null,
    };
  }

  componentDidMount() {
    // Parse session token from URL
    const result = parseSessionToken();

    if (result.error || !result.token) {
      this.setState({
        status: 'error',
        error: result.error || 'Invalid or missing session token in URL. Please use the viewer link from your session details.',
      });
      return;
    }

    this.setState({ session: result.token, status: 'connecting' });
    this.connectToStream(result.token);
  }

  private async connectToStream(session: SessionToken) {
    // Note: Direct VPN connection requires either:
    // 1. User is on VPN network (can connect directly to VPN IP)
    // 2. Signaling proxy + TURN relay (for public internet access)
    //
    // For now, we attempt direct connection - this will work if:
    // - Isaac Sim is exposing ports publicly on Vast (not recommended)
    // - User has VPN access to the control plane network
    //
    // TODO: Implement signaling proxy at API level for public access

    const streamConfig: DirectConfig = {
      videoElementId: 'synth-video',
      audioElementId: 'synth-audio',
      authenticate: false,
      maxReconnects: 5,
      // Connect to Isaac Sim via VPN IP
      // This requires network connectivity to the VPN
      signalingServer: session.vpnIp,
      signalingPort: session.streamPort,
      mediaServer: session.vpnIp,
      mediaPort: session.udpPort,
      nativeTouchEvents: true,
      width: 1920,
      height: 1080,
      fps: 60,
      // ICE servers for WebRTC (STUN/TURN)
      // @ts-ignore - iceServers may not be in type but is supported
      iceServers: getIceServers(this.config),
      onUpdate: (message: StreamEvent) => this.handleUpdate(message),
      onStart: (message: StreamEvent) => this.handleStart(message),
      onStop: (message: StreamEvent) => this.handleStop(message),
      onTerminate: (message: StreamEvent) => this.handleTerminate(message),
      onCustomEvent: (message: any) => console.log('Custom event:', message),
    };

    try {
      const streamProps: StreamProps = {
        streamConfig,
        streamSource: StreamType.DIRECT,
      };

      await AppStreamer.connect(streamProps);
    } catch (error) {
      console.error('Failed to connect:', error);
      this.setState({
        status: 'error',
        error: `Connection failed. Make sure your session is running and you have network access to the VPN.\n\nVPN IP: ${session.vpnIp}\nStream Port: ${session.streamPort}`,
      });
    }
  }

  private handleStart(message: StreamEvent) {
    console.log('Stream start:', message);
    if (message.action === 'start' && message.status === 'success') {
      this.setState({ status: 'connected' });
    } else if (message.status === 'error') {
      this.setState({
        status: 'error',
        error: `Stream error: ${message.info || 'Unknown error'}`,
      });
    }
  }

  private handleUpdate(message: StreamEvent) {
    console.log('Stream update:', message);
  }

  private handleStop(message: StreamEvent) {
    console.log('Stream stopped:', message);
    this.setState({
      status: 'error',
      error: 'Stream stopped. The session may have ended.',
    });
  }

  private handleTerminate(message: StreamEvent) {
    console.log('Stream terminated:', message);
    this.setState({
      status: 'error',
      error: 'Stream terminated. Please refresh to reconnect.',
    });
  }

  render() {
    const { status, error, session } = this.state;

    return (
      <div className="synth-viewer">
        {/* Loading/connecting overlay */}
        {(status === 'loading' || status === 'connecting') && (
          <div className="synth-overlay">
            <div className="synth-status">
              <div className="synth-spinner" />
              <h2>{status === 'loading' ? 'INITIALIZING' : 'CONNECTING'}</h2>
              {session && (
                <p className="synth-session-info">
                  Session: {session.sessionId}<br />
                  Target: {session.vpnIp}:{session.streamPort}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Error overlay */}
        {status === 'error' && (
          <div className="synth-overlay synth-error">
            <div className="synth-status">
              <h2>[CONNECTION FAILED]</h2>
              <p className="synth-error-message">{error}</p>
              <div className="synth-actions">
                <button onClick={() => window.location.reload()}>
                  RETRY
                </button>
                <a href="https://cyberneticphysics.com/sessions" target="_blank" rel="noreferrer">
                  VIEW SESSIONS
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Video stream */}
        <div className="synth-stream" style={{ visibility: status === 'connected' ? 'visible' : 'hidden' }}>
          <video
            id="synth-video"
            autoPlay
            playsInline
            muted
          />
          <audio id="synth-audio" muted />
        </div>

        {/* Connection info bar */}
        {status === 'connected' && session && (
          <div className="synth-info-bar">
            <span className="synth-status-dot" />
            CONNECTED | {session.sessionId}
          </div>
        )}
      </div>
    );
  }
}
