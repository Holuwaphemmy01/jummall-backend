export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

export interface TokenSigner {
  sign(payload: TokenPayload): Promise<string>;
}
