export type JwtPayload = { sub: string; role: string; type: "access" | "refresh" };

export enum TokenExpiry {
  ACCESS_TOKEN_EXPIRES = "15m",
  REFRESH_TOKEN_EXPIRES = "7d",
}
