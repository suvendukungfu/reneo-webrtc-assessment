export type ClientMessageType =
  | 'JOIN'
  | 'OFFER'
  | 'ANSWER'
  | 'ICE_CANDIDATE'
  | 'LEAVE';

export type ServerMessageType =
  | 'JOINED'
  | 'PEER_JOINED'
  | 'PEER_LEFT'
  | 'OFFER'
  | 'ANSWER'
  | 'ICE_CANDIDATE'
  | 'ROOM_FULL'
  | 'ERROR';

export interface JoinPayload {
  roomId: string;
  displayName?: string;
}

export interface OfferPayload {
  sdp: RTCSessionDescriptionInit;
}

export interface AnswerPayload {
  sdp: RTCSessionDescriptionInit;
}

export interface IceCandidatePayload {
  candidate: RTCIceCandidateInit;
}

export type ClientSignalMessage =
  | { type: 'JOIN'; payload: JoinPayload }
  | { type: 'OFFER'; payload: OfferPayload }
  | { type: 'ANSWER'; payload: AnswerPayload }
  | { type: 'ICE_CANDIDATE'; payload: IceCandidatePayload }
  | { type: 'LEAVE' };

export type ServerSignalMessage =
  | { type: 'JOINED'; payload: { clientId: string; roomId: string; isInitiator: boolean } }
  | { type: 'PEER_JOINED'; payload: { peerId: string } }
  | { type: 'PEER_LEFT'; payload: { peerId: string } }
  | { type: 'OFFER'; payload: { sdp: RTCSessionDescriptionInit; senderId: string } }
  | { type: 'ANSWER'; payload: { sdp: RTCSessionDescriptionInit; senderId: string } }
  | { type: 'ICE_CANDIDATE'; payload: { candidate: RTCIceCandidateInit; senderId: string } }
  | { type: 'ROOM_FULL'; payload: { roomId: string; message: string } }
  | { type: 'ERROR'; payload: { message: string; code?: string } };
