import { WebSocket } from 'ws';

export interface RoomParticipant {
  clientId: string;
  socket: WebSocket;
  displayName?: string;
  isInitiator: boolean;
  roomId: string;
}

export type JoinRoomResult =
  | {
      success: true;
      isInitiator: boolean;
      roomId: string;
      existingPeer: RoomParticipant | null;
      participant: RoomParticipant;
    }
  | {
      success: false;
      reason: 'ROOM_FULL' | 'INVALID_ROOM_ID';
      message: string;
    };

export class RoomManager {
  private rooms: Map<string, RoomParticipant[]> = new Map();
  private clientRoomMap: Map<WebSocket, RoomParticipant> = new Map();

  /**
   * Sanitizes and validates room IDs
   */
  public validateRoomId(roomId: string): boolean {
    if (!roomId || typeof roomId !== 'string') return false;
    const trimmed = roomId.trim();
    if (trimmed.length < 1 || trimmed.length > 64) return false;
    // Allow alphanumeric, hyphens, and underscores
    return /^[a-zA-Z0-9_-]+$/.test(trimmed);
  }

  /**
   * Sanitizes display name
   */
  public sanitizeDisplayName(displayName?: string): string {
    if (!displayName || typeof displayName !== 'string') return 'Anonymous';
    const trimmed = displayName.trim();
    return trimmed.slice(0, 32) || 'Anonymous';
  }

  /**
   * Adds a participant to a room (max 2 participants per room)
   */
  public joinRoom(
    roomId: string,
    clientId: string,
    socket: WebSocket,
    rawDisplayName?: string
  ): JoinRoomResult {
    const cleanRoomId = roomId.trim();
    if (!this.validateRoomId(cleanRoomId)) {
      return {
        success: false,
        reason: 'INVALID_ROOM_ID',
        message: 'Room ID must be 1-64 characters and contain only letters, numbers, hyphens, or underscores.',
      };
    }

    // If client is already in a room, remove them first
    this.leaveRoom(socket);

    const existingParticipants = this.rooms.get(cleanRoomId) || [];
    if (existingParticipants.length >= 2) {
      return {
        success: false,
        reason: 'ROOM_FULL',
        message: `Room "${cleanRoomId}" is full. Maximum 2 participants allowed.`,
      };
    }

    const isInitiator = existingParticipants.length === 0;
    const displayName = this.sanitizeDisplayName(rawDisplayName);

    const participant: RoomParticipant = {
      clientId,
      socket,
      displayName,
      isInitiator,
      roomId: cleanRoomId,
    };

    const existingPeer = existingParticipants.length > 0 ? existingParticipants[0] : null;

    existingParticipants.push(participant);
    this.rooms.set(cleanRoomId, existingParticipants);
    this.clientRoomMap.set(socket, participant);

    return {
      success: true,
      isInitiator,
      roomId: cleanRoomId,
      existingPeer,
      participant,
    };
  }

  /**
   * Removes a participant when they explicitly leave or disconnect
   */
  public leaveRoom(socket: WebSocket): {
    leftParticipant: RoomParticipant | null;
    remainingPeer: RoomParticipant | null;
    roomId: string | null;
  } {
    const participant = this.clientRoomMap.get(socket);
    if (!participant) {
      return { leftParticipant: null, remainingPeer: null, roomId: null };
    }

    const { roomId } = participant;
    this.clientRoomMap.delete(socket);

    const participants = this.rooms.get(roomId);
    if (!participants) {
      return { leftParticipant: participant, remainingPeer: null, roomId };
    }

    const updatedParticipants = participants.filter((p) => p.socket !== socket);
    if (updatedParticipants.length === 0) {
      this.rooms.delete(roomId);
      return { leftParticipant: participant, remainingPeer: null, roomId };
    }

    this.rooms.set(roomId, updatedParticipants);
    const remainingPeer = updatedParticipants[0];

    return { leftParticipant: participant, remainingPeer, roomId };
  }

  /**
   * Finds the peer participant in the same room
   */
  public getPeer(socket: WebSocket): RoomParticipant | null {
    const participant = this.clientRoomMap.get(socket);
    if (!participant) return null;

    const participants = this.rooms.get(participant.roomId);
    if (!participants || participants.length < 2) return null;

    return participants.find((p) => p.socket !== socket) || null;
  }

  /**
   * Retrieves participant details for a given socket connection
   */
  public getParticipant(socket: WebSocket): RoomParticipant | null {
    return this.clientRoomMap.get(socket) || null;
  }

  /**
   * Returns active room metrics (useful for diagnostics)
   */
  public getStats() {
    return {
      totalRooms: this.rooms.size,
      totalClients: this.clientRoomMap.size,
    };
  }
}
