import jwt from "jsonwebtoken";

import type { TokenPayload } from "../../ports/token-signer";
import type { TokenVerifier } from "../../ports/token-verifier";

export class JwtTokenVerifier implements TokenVerifier {
  async verify(token: string): Promise<TokenPayload> {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not set.");
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    if (
      typeof decodedToken !== "object" ||
      decodedToken === null ||
      typeof decodedToken.sub !== "string" ||
      typeof decodedToken.email !== "string" ||
      typeof decodedToken.role !== "string"
    ) {
      throw new Error("Invalid token payload.");
    }

    return {
      sub: decodedToken.sub,
      email: decodedToken.email,
      role: decodedToken.role
    };
  }
}
