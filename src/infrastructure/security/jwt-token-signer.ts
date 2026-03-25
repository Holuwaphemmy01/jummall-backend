import jwt, { type SignOptions } from "jsonwebtoken";

import type { TokenPayload, TokenSigner } from "../../ports/token-signer";

export class JwtTokenSigner implements TokenSigner {
  async sign(payload: TokenPayload): Promise<string> {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not set.");
    }

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: (process.env.JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"]
    });
  }
}
