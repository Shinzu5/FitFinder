import type { Server as HTTPServer } from "http";
import { Server as IOServer, type Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";
import { env } from "../config/env";

let io: IOServer | null = null;

export function userRoom(userId: string): string {
  return `user:${userId}`;
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
  });

  return io;
}

export function getIO(): IOServer {
  if (!io) {
    throw new Error("Socket.IO has not been initialized yet");
  }
  return io;
}
