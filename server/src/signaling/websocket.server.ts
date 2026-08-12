import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import { RoomManager } from '../rooms/room.manager.js';
import { ClientSignalMessage, ServerSignalMessage } from '../types/signaling.js';

export class SignalingServer {
  private wss: WebSocketServer;
  private roomManager: RoomManager;

  constructor(port: number = 8080) {
    this.roomManager = new RoomManager();
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (socket: WebSocket) => {
      const clientId = randomUUID();
      (socket as any).clientId = clientId;

      socket.on('message', (rawMessage: Buffer | string) => {
        this.handleMessage(socket, clientId, rawMessage);
      });

      socket.on('close', () => {
        this.handleDisconnect(socket);
      });

      socket.on('error', (err) => {
        console.error(`[SignalingServer] Socket error for ${clientId}:`, err.message);
        this.handleDisconnect(socket);
      });
    });

    console.log(`[SignalingServer] WebSocket signaling server listening on ws://localhost:${port}`);
  }

  private send(socket: WebSocket, message: ServerSignalMessage): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  private handleMessage(socket: WebSocket, clientId: string, rawMessage: Buffer | string): void {
    let msg: ClientSignalMessage;
    try {
      msg = JSON.parse(rawMessage.toString());
    } catch {
      this.send(socket, {
        type: 'ERROR',
        payload: { message: 'Malformed JSON payload' },
      });
      return;
    }

    if (!msg || typeof msg.type !== 'string') {
      this.send(socket, {
        type: 'ERROR',
        payload: { message: 'Invalid message structure. "type" field is required.' },
      });
      return;
    }

    switch (msg.type) {
      case 'JOIN': {
        const { roomId, displayName } = msg.payload || {};
        if (!roomId) {
          this.send(socket, {
            type: 'ERROR',
            payload: { message: 'JOIN message requires "roomId"' },
          });
          return;
        }

        const result = this.roomManager.joinRoom(roomId, clientId, socket, displayName);

        if (!result.success) {
          if (result.reason === 'ROOM_FULL') {
            this.send(socket, {
              type: 'ROOM_FULL',
              payload: { roomId, message: result.message },
            });
          } else {
            this.send(socket, {
              type: 'ERROR',
              payload: { message: result.message },
            });
          }
          return;
        }

        // Send JOINED confirmation to joining client
        this.send(socket, {
          type: 'JOINED',
          payload: {
            clientId,
            roomId: result.roomId,
            isInitiator: result.isInitiator,
          },
        });

        // If there was already a participant waiting in the room, notify both
        if (result.existingPeer) {
          // Notify existing peer that a new peer joined
          this.send(result.existingPeer.socket, {
            type: 'PEER_JOINED',
            payload: { peerId: clientId },
          });

          // Notify joining peer about existing peer
          this.send(socket, {
            type: 'PEER_JOINED',
            payload: { peerId: result.existingPeer.clientId },
          });
        }
        break;
      }

      case 'OFFER': {
        const peer = this.roomManager.getPeer(socket);
        if (!peer) {
          this.send(socket, {
            type: 'ERROR',
            payload: { message: 'Cannot send OFFER: No peer in room.' },
          });
          return;
        }
        if (!msg.payload || !msg.payload.sdp) {
          this.send(socket, {
            type: 'ERROR',
            payload: { message: 'OFFER message requires valid "sdp" payload' },
          });
          return;
        }

        this.send(peer.socket, {
          type: 'OFFER',
          payload: {
            sdp: msg.payload.sdp,
            senderId: clientId,
          },
        });
        break;
      }

      case 'ANSWER': {
        const peer = this.roomManager.getPeer(socket);
        if (!peer) {
          this.send(socket, {
            type: 'ERROR',
            payload: { message: 'Cannot send ANSWER: No peer in room.' },
          });
          return;
        }
        if (!msg.payload || !msg.payload.sdp) {
          this.send(socket, {
            type: 'ERROR',
            payload: { message: 'ANSWER message requires valid "sdp" payload' },
          });
          return;
        }

        this.send(peer.socket, {
          type: 'ANSWER',
          payload: {
            sdp: msg.payload.sdp,
            senderId: clientId,
          },
        });
        break;
      }

      case 'ICE_CANDIDATE': {
        const peer = this.roomManager.getPeer(socket);
        if (!peer) {
          // Candidates can arrive right as a peer leaves, log silently
          return;
        }
        if (!msg.payload || !msg.payload.candidate) {
          this.send(socket, {
            type: 'ERROR',
            payload: { message: 'ICE_CANDIDATE message requires "candidate" payload' },
          });
          return;
        }

        this.send(peer.socket, {
          type: 'ICE_CANDIDATE',
          payload: {
            candidate: msg.payload.candidate,
            senderId: clientId,
          },
        });
        break;
      }

      case 'LEAVE': {
        this.handleDisconnect(socket);
        break;
      }

      default: {
        this.send(socket, {
          type: 'ERROR',
          payload: { message: `Unknown message type: ${(msg as any).type}` },
        });
        break;
      }
    }
  }

  private handleDisconnect(socket: WebSocket): void {
    const { leftParticipant, remainingPeer } = this.roomManager.leaveRoom(socket);

    if (leftParticipant && remainingPeer) {
      this.send(remainingPeer.socket, {
        type: 'PEER_LEFT',
        payload: { peerId: leftParticipant.clientId },
      });
    }
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      this.wss.close(() => resolve());
    });
  }
}
