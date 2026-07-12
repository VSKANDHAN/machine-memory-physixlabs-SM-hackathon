// Socket.io client singleton — reuse one connection across components
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => console.log('[Socket.io] Connected to backend'));
    socket.on('disconnect', () => console.log('[Socket.io] Disconnected from backend'));
  }
  return socket;
}
