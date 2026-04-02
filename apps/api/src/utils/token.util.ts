import crypto, { createHash } from "node:crypto";
import type { PrismaClient } from "@buildtrack/database";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function parseDurationToMs(duration: string): number {
  const match = duration.trim().match(/^(\d+)([smhd])$/i);

  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

export async function issueRefreshToken(
  prisma: PrismaClient,
  userId: string,
): Promise<string> {
  const refreshToken = crypto.randomBytes(64).toString("hex");
  const refreshTokenTtl =
    process.env.REFRESH_TOKEN_EXPIRES_IN?.trim() || "7d";

  await prisma.refreshToken.create({
    data: {
      userId,
      token: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + parseDurationToMs(refreshTokenTtl)),
    },
  });

  return refreshToken;
}
