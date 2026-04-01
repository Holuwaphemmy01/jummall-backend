export interface RefreshTokenSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRefreshTokenSessionInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface RotateRefreshTokenSessionInput {
  sessionId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface RevokeRefreshTokenSessionInput {
  sessionId: string;
  userId: string;
}

export interface RefreshTokenSessionRepository {
  create(
    input: CreateRefreshTokenSessionInput
  ): Promise<RefreshTokenSession>;
  findActiveByTokenHash(tokenHash: string): Promise<RefreshTokenSession | null>;
  rotate(input: RotateRefreshTokenSessionInput): Promise<void>;
  revoke(input: RevokeRefreshTokenSessionInput): Promise<void>;
}
