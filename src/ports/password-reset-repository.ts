export interface SavePasswordResetInput {
  userId: string;
  code: string;
  expiresAt: Date;
}

export interface PasswordResetRecord {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  code: string;
  status: "active" | "used" | "expired" | "invalidated";
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface PasswordResetRepository {
  save(input: SavePasswordResetInput): Promise<void>;
  findByEmailAndCode(
    email: string,
    code: string
  ): Promise<PasswordResetRecord | null>;
  markAsUsed(resetId: string): Promise<void>;
  markAsExpired(resetId: string): Promise<void>;
}
