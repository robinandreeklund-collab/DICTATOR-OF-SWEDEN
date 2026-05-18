import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@dos/shared';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Ansluter till samma origin som sidan serveras fran.
// I utveckling proxar Vite /socket.io vidare till spelservern.
export const socket: AppSocket = io({
  autoConnect: true,
  transports: ['websocket', 'polling'],
});
