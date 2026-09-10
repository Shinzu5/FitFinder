"use client";

import { io, type Socket } from "socket.io-client";
import { resolveApiBaseUrl } from "@/lib/api-base";

const API_BASE_URL = resolveApiBaseUrl();

let socket: Socket | null = null;
let socketToken: string | null = null;

// Reuses a single socket connection for the whole app; reconnects only when
// the access token actually changes (e.g. after login or token refresh).
export function getSocket(token: string): Socket {
  // Keep the same instance while connecting/reconnecting so listeners stay attached.
  if (socket && socketToken === token) {
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  socketToken = token;
  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  socketToken = null;
}
