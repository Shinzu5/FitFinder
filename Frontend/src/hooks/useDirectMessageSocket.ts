"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { getSocket } from "@/lib/socket";
import { useOwnerMessagesStore } from "@/stores/owner-messages-store";
import { useUserMessagesStore } from "@/stores/user-messages-store";
import { useClerkMessagesStore } from "@/stores/clerk-messages-store";

interface IncomingMessagePayload {
  message: {
    id: string;
    senderId: string;
    receiverId: string;
    text: string;
    createdAt: string;
  };
  sender: {
    id: string;
    fullName: string;
    role: string;
    avatarUrl?: string | null;
  };
}

// Keeps a single live socket connection per authenticated session and fans
// incoming direct messages into whichever role store is active.
export function useDirectMessageSocket() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.role);
  const receiveOwnerMessage = useOwnerMessagesStore((state) => state.receiveMessage);
  const receiveUserMessage = useUserMessagesStore((state) => state.receiveMessage);
  const receiveClerkMessage = useClerkMessagesStore((state) => state.receiveMessage);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const socket = getSocket(accessToken);

    function handleReceiveMessage(payload: IncomingMessagePayload) {
      if (role === "OWNER") {
        receiveOwnerMessage(payload.message, payload.sender);
      } else if (role === "CLERK") {
        receiveClerkMessage(payload.message, payload.sender);
      } else {
        receiveUserMessage(payload.message, payload.sender);
      }
    }

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [
    accessToken,
    isAuthenticated,
    role,
    receiveOwnerMessage,
    receiveUserMessage,
    receiveClerkMessage,
  ]);
}
