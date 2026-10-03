import { GymRepository } from "@/repositories/gym.repository";
import { MessagingRepository } from "@/repositories/messaging.repository";
import { UserRepository } from "@/repositories/user.repository";
import { canMessage } from "@/utils/messagingRules";

const gymRepository = new GymRepository();
const messagingRepository = new MessagingRepository();
const userRepository = new UserRepository();

type UserSummary = NonNullable<Awaited<ReturnType<UserRepository["findSummaryById"]>>>;

type GetThreadResult =
  | { kind: "not-found" }
  | { kind: "forbidden" }
  | {
      kind: "ok";
      user: UserSummary;
      gymName: string | null;
      messages: Awaited<ReturnType<MessagingRepository["listThread"]>>;
    };

/**
 * GET /api/messages/thread/:userId — one DM thread.
 * Opening a thread marks inbound messages as read.
 */
export async function GetThreadService(opts: {
  userId: string;
  otherUserId: string;
  actorRole: string;
}): Promise<GetThreadResult> {
  const { userId, otherUserId, actorRole } = opts;

  const otherUser = await userRepository.findSummaryById(otherUserId);

  if (!otherUser) {
    return { kind: "not-found" };
  }

  if (!canMessage(actorRole, otherUser.role)) {
    return { kind: "forbidden" };
  }

  const messages = await messagingRepository.listThread(userId, otherUserId);

  // Opening a thread marks inbound messages as read
  await messagingRepository.markReadFrom(otherUserId, userId);

  const gym =
    otherUser.role === "OWNER"
      ? await gymRepository.findLatestActiveNameByOwner(otherUserId)
      : null;

  return { kind: "ok", user: otherUser, gymName: gym?.name || null, messages };
}
