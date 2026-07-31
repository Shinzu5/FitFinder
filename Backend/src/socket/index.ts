import type { Server as HTTPServer } from "http";
import { Server as IOServer, type Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";
import { env } from "../config/env";

let io: IOServer | null = null;

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function gymRoom(gymId: string): string {
  return `gym:${gymId}`;
}

export function initSocket(server: HTTPServer): IOServer {
  io = new IOServer(server, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ||
        (socket.handshake.query?.token as string | undefined);

      if (!token) {
        next(new Error("Authentication required"));
        return;
      }

      const payload = verifyAccessToken(token);
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      next();
    } catch (error) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;
    socket.join(userRoom(userId));

    socket.on("join_gym", (gymId: unknown) => {
      if (typeof gymId === "string" && gymId.trim()) {
        socket.join(gymRoom(gymId.trim()));
      }
    });

    socket.on("leave_gym", (gymId: unknown) => {
      if (typeof gymId === "string" && gymId.trim()) {
        socket.leave(gymRoom(gymId.trim()));
      }
    });
  });

  return io;
}

export function getIO(): IOServer {
  if (!io) {
    throw new Error("Socket.IO has not been initialized yet");
  }
  return io;
}

/** Safe emit — no-op if sockets are not ready (e.g. during tests). */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  try {
    getIO().to(userRoom(userId)).emit(event, payload);
  } catch {
    // Socket not initialized
  }
}

export function emitToGym(gymId: string, event: string, payload: unknown): void {
  try {
    getIO().to(gymRoom(gymId)).emit(event, payload);
  } catch {
    // Socket not initialized
  }
}
