import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@dos/shared';
import { Room } from './Room.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CLEANUP_GRACE_MS = 60_000;

export class RoomManager {
  private rooms = new Map<string, Room>();
  private cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private io: IO;

  constructor(io: IO) {
    this.io = io;
  }

  private generateCode(): string {
    for (let attempt = 0; attempt < 1000; attempt++) {
      let code = '';
      for (let i = 0; i < 4; i++) {
        code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
    throw new Error('Kunde inte generera rumskod.');
  }

  createRoom(): Room {
    const code = this.generateCode();
    const room = new Room(code, this.io);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get((code ?? '').toUpperCase().trim());
  }

  /** Avbryt en planerad stadning (nagon anslot ater). */
  cancelCleanup(code: string): void {
    const timer = this.cleanupTimers.get(code);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(code);
    }
  }

  /** Schemalagg stadning av ett tomt rum efter en frist. */
  scheduleCleanup(code: string): void {
    this.cancelCleanup(code);
    const timer = setTimeout(() => {
      this.cleanupTimers.delete(code);
      const room = this.rooms.get(code);
      if (room && room.isEmpty) {
        room.close('Rummet stangdes pa grund av inaktivitet.');
        this.rooms.delete(code);
      }
    }, CLEANUP_GRACE_MS);
    this.cleanupTimers.set(code, timer);
  }

  get roomCount(): number {
    return this.rooms.size;
  }
}
