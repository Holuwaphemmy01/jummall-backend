import type { TokenPayload } from "./token-signer";

export interface TokenVerifier {
  verify(token: string): Promise<TokenPayload>;
}
