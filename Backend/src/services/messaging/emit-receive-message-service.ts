import { getIO, userRoom } from "@/socket";

function serializeDirectMessage(message: {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: Date | string;
}) {
  return {
    id: String(message.id),
    senderId: String(message.senderId),
    receiverId: String(message.receiverId),
    text: message.text,
    createdAt:
      message.createdAt instanceof Date
        ? message.createdAt.toISOString()
        : String(message.createdAt),
  };
}

/** Fan a new DM out to both participants (receiver live, sender's other tabs). */
export function EmitReceiveMessageService(payload: {
  message: {
    id: string;
    senderId: string;
    receiverId: string;
    text: string;
    createdAt: Date | string;
  };
  sender: unknown;
  toUserIds: string[];
}) {
  try {
    const io = getIO();
    const message = serializeDirectMessage(payload.message);
    for (const id of payload.toUserIds) {
      io.to(userRoom(String(id))).emit("receive_message", {
        message,
        sender: payload.sender,
      });
    }
  } catch (socketError) {
    console.error("Socket emit failed:", socketError);
  }
}
