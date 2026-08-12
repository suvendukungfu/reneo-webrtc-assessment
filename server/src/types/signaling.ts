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
  sdp: {
    type: 'offer';
    sdp: string;
  };
}

export interface AnswerPayload {
  sdp: {
    type: 'answer';
    sdp: string;
  };
}

export interface IceCandidatePayload {
  candidate: {
    candidate: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
    usernameFragment?: string | null;
  };
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
  | { type: 'PEER_LEFT'; payload: { peerId: string; isInitiator?: boolean } }
  | { type: 'OFFER'; payload: { sdp: OfferPayload['sdp']; senderId: string } }
  | { type: 'ANSWER'; payload: { sdp: AnswerPayload['sdp']; senderId: string } }
  | { type: 'ICE_CANDIDATE'; payload: { candidate: IceCandidatePayload['candidate']; senderId: string } }
  | { type: 'ROOM_FULL'; payload: { roomId: string; message: string } }
  | { type: 'ERROR'; payload: { message: string; code?: string } };
