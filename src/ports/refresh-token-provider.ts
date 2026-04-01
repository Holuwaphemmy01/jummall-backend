export interface IssuedRefreshToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface RefreshTokenProvider {
  issue(): Promise<IssuedRefreshToken>;
  hash(token: string): Promise<string>;
}
