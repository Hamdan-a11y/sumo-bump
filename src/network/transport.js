import Peer from 'peerjs';

export class NetworkTransport {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.isHost = false;
    this.callbacks = {
      onConnected: () => {},
      onData: () => {},
      onDisconnected: () => {},
      onError: () => {},
    };
  }

  // Generate a friendly 4-letter room code (e.g. "BUMP-7X9A")
  generateRoomId() {
    return 'sumo-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  // 1. Host creates a room
  createRoom(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    this.isHost = true;
    const roomId = this.generateRoomId();

    this.peer = new Peer(roomId, {
      debug: 1,
    });

    this.peer.on('open', (id) => {
      console.log('[Transport] Room opened with ID:', id);
    });

    this.peer.on('connection', (connection) => {
      this.conn = connection;
      this.setupConnection();
    });

    this.peer.on('error', (err) => {
      console.error('[Transport Error]', err);
      this.callbacks.onError(err);
    });

    return roomId;
  }

  // 2. Guest joins an existing room
  joinRoom(roomId, callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    this.isHost = false;

    this.peer = new Peer(null, {
      debug: 1,
    });

    this.peer.on('open', () => {
      console.log('[Transport] Connecting to host:', roomId);
      this.conn = this.peer.connect(roomId, {
        reliable: false, // UDP-like low latency for real-time gaming
      });
      this.setupConnection();
    });

    this.peer.on('error', (err) => {
      console.error('[Transport Error]', err);
      this.callbacks.onError(err);
    });
  }

  setupConnection() {
    this.conn.on('open', () => {
      console.log('[Transport] Peer-to-peer data channel open!');
      this.callbacks.onConnected(this.isHost);
    });

    this.conn.on('data', (data) => {
      this.callbacks.onData(data);
    });

    this.conn.on('close', () => {
      console.log('[Transport] Peer disconnected');
      this.callbacks.onDisconnected();
    });
  }

  // Send an input packet or state snapshot
  send(payload) {
    if (this.conn && this.conn.open) {
      this.conn.send(payload);
    }
  }

  destroy() {
    if (this.conn) this.conn.close();
    if (this.peer) this.peer.destroy();
  }
}
