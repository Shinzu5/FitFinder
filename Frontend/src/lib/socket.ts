"use client";

import { io, type Socket } from "socket.io-client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

let socket: Socket | null = null;
let socketToken: string | null = null;

// Reuses a single socket connection for the whole app; reconnects only when
// the access token actually changes (e.g. after login or token refresh).
export function getSocket(token: string): Socket {
  if (socket && socketToken === token && socket.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  socketToken = token;
  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  socketToken = null;
}
