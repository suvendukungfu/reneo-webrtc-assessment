import { SignalingServer } from './signaling/websocket.server.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

new SignalingServer(PORT);
