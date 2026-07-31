"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { getSocket } from "@/lib/socket";
import { useOwnerMessagesStore } from "@/stores/owner-messages-store";
import { useUserMessagesStore } from "@/stores/user-messages-store";
import { useClerkMessagesStore } from "@/stores/clerk-messages-store";
import { useAdminMessagesStore } from "@/stores/admin-messages-store";

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

function removePeerConversation(peerId: string) {
  const role = useAuthStore.getState().role;
  const id = String(peerId);

  if (role === "ADMIN") {
    const store = useAdminMessagesStore.getState();
    const remaining = store.threads.filter((t) => t.id !== id);
    useAdminMessagesStore.setState({
      threads: remaining,
      activeThreadId:
        store.activeThreadId === id ? remaining[0]?.id ?? "" : store.activeThreadId,
    });
    return;
  }

  if (role === "OWNER") {
    const store = useOwnerMessagesStore.getState();
    const remainingConversations = store.conversations.filter((c) => c.id !== id);
    const remainingContacts = store.contacts.filter((c) => c.id !== id);
    useOwnerMessagesStore.setState({
      conversations: remainingConversations,
      contacts: remainingContacts,
      activeConversationId:
        store.activeConversationId === id
          ? remainingContacts[0]?.id ?? ""
          : store.activeConversationId,
    });
    return;
  }

  if (role === "CLERK") {
    const store = useClerkMessagesStore.getState();
    const remainingConversations = store.conversations.filter((c) => c.id !== id);
    const remainingContacts = store.contacts.filter((c) => c.id !== id);
    useClerkMessagesStore.setState({
      conversations: remainingConversations,
      contacts: remainingContacts,
      activeConversationId:
        store.activeConversationId === id
          ? remainingContacts[0]?.id ?? ""
          : store.activeConversationId,
    });
    return;
  }

  const store = useUserMessagesStore.getState();
  const remaining = store.threads.filter((t) => t.id !== id);
  useUserMessagesStore.setState({
    threads: remaining,
    activeThreadId: store.activeThreadId === id ? remaining[0]?.id ?? "" : store.activeThreadId,
  });
}

function routeIncomingMessage(payload: IncomingMessagePayload) {
  const activeRole = useAuthStore.getState().role;
  const message = {
    ...payload.message,
    id: String(payload.message.id),
    senderId: String(payload.message.senderId),
    receiverId: String(payload.message.receiverId),
  };
  const sender = {
    ...payload.sender,
    id: String(payload.sender.id),
  };

  if (activeRole === "ADMIN") {
    useAdminMessagesStore.getState().receiveMessage(message, sender);
  } else if (activeRole === "OWNER") {
    useOwnerMessagesStore.getState().receiveMessage(message, sender);
  } else if (activeRole === "CLERK") {
    useClerkMessagesStore.getState().receiveMessage(message, sender);
  } else {
    useUserMessagesStore.getState().receiveMessage(message, sender);
  }
}

/** Live DM fan-out into the active role's message store. */
export function useDirectMessageSocket() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.role);
  const userId = useAuthStore((state) => state.user?.id);

  useEffect(() => {
    if (!userId) return;
    useUserMessagesStore.getState().setCurrentUserId(userId);
    useOwnerMessagesStore.getState().setCurrentUserId(userId);
    useClerkMessagesStore.getState().setCurrentUserId(userId);
    useAdminMessagesStore.getState().setCurrentUserId(userId);
  }, [userId]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const socket = getSocket(accessToken);

    function handleReceiveMessage(payload: IncomingMessagePayload) {
      if (!payload?.message || !payload?.sender) return;
      routeIncomingMessage(payload);
    }

    function handleConversationDeleted(payload: { peerId: string }) {
      if (!payload?.peerId) return;
      removePeerConversation(payload.peerId);
    }

    socket.on("receive_message", handleReceiveMessage);
    socket.on("conversation_deleted", handleConversationDeleted);
    socket.on("conversation_hidden", handleConversationDeleted);

    // Ensure we are connected (token refresh / first mount).
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("conversation_deleted", handleConversationDeleted);
      socket.off("conversation_hidden", handleConversationDeleted);
    };
  }, [accessToken, isAuthenticated, role]);
}
