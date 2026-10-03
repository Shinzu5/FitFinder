import { UserRole } from "@prisma/client";
import { MessagingRepository } from "@/repositories/messaging.repository";
import { UserRepository } from "@/repositories/user.repository";
import { EmitReceiveMessageService as emitReceiveMessage } from "@/services/messaging/emit-receive-message-service";
import { CreateNotificationService as createNotification } from "@/services/notification";
import { canMessage } from "@/utils/messagingRules";

const messagingRepository = new MessagingRepository();
const userRepository = new UserRepository();

type SendDirectMessageResult =
  | { kind: "error"; status: number; message: string }
  | {
      kind: "ok";
      message: Awaited<ReturnType<MessagingRepository["sendDirectMessageWithUnhide"]>>["message"];
    };

/**
 * POST /api/messages — validate the recipient, then unhide + insert the DM in
 * one atomic unit, fan it out and notify the receiver.
 */
export async function SendDirectMessageService(input: {
  senderId: string;
  senderRole: string;
  receiverId?: any;
  text?: any;
}): Promise<SendDirectMessageResult> {
  const { senderId, senderRole, receiverId, text } = input;

  if (!receiverId || !text?.trim()) {
    return {
      kind: "error",
      status: 400,
      message: "receiverId and text are required",
    };
  }

  if (receiverId === senderId) {
    return { kind: "error", status: 400, message: "You cannot message yourself" };
  }

  const receiver = await userRepository.findIdAndRoleById(receiverId);

  if (!receiver) {
    return { kind: "error", status: 404, message: "Recipient not found" };
  }

  if (!canMessage(senderRole, receiver.role)) {
    return {
      kind: "error",
      status: 403,
      message: "You are not allowed to message this user",
    };
  }

  const { message, sender } = await messagingRepository.sendDirectMessageWithUnhide({
    senderId,
    receiverId,
    senderRole: senderRole as UserRole,
    receiverRole: receiver.role,
    text: text.trim(),
  });

  emitReceiveMessage({
    message,
    sender,
    // Receiver gets it live; sender's other tabs stay in sync too
    toUserIds: [receiverId, senderId],
  });

  const preview =
    message.text.length > 80 ? `${message.text.slice(0, 80)}…` : message.text;
  void createNotification({
    userId: receiverId,
    type: "MESSAGE",
    title: "New message",
    body: `${sender?.fullName || "Someone"}: ${preview}`,
    data: {
      messageId: message.id,
      senderId,
      senderName: sender?.fullName || "",
      senderRole: sender?.role || "",
    },
    dedupeKey: `message:${message.id}`,
  });

  return { kind: "ok", message };
}
