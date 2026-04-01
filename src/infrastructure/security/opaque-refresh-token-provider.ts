import { createHash, randomBytes } from "crypto";

import type {
  IssuedRefreshToken,
  RefreshTokenProvider
} from "../../ports/refresh-token-provider";

export class OpaqueRefreshTokenProvider implements RefreshTokenProvider {
  constructor(private readonly ttlDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30)) {}

  async issue(): Promise<IssuedRefreshToken> {
    const token = randomBytes(48).toString("base64url");

    return {
      token,
      tokenHash: await this.hash(token),
      expiresAt: new Date(Date.now() + this.ttlDays * 24 * 60 * 60 * 1000)
    };
  }

  async hash(token: string): Promise<string> {
    return createHash("sha256").update(token).digest("hex");
  }
}
