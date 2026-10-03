import { UserRepository } from "@/repositories/user.repository";

const userRepository = new UserRepository();

/** GET /api/messages/search?q=... — users the actor may start a DM with. */
export async function SearchUsersService(opts: {
  excludeUserId: string;
  query: string;
}) {
  return userRepository.searchByQuery(opts.excludeUserId, opts.query);
}
