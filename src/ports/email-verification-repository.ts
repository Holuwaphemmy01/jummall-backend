export interface SaveEmailVerificationInput {
  userId: string;
  code: string;
  expiresAt: Date;
}

export interface EmailVerificationRecord {
  userId: string;
  email: string;
  firstName: string | null;
  accountStatus: string;
  code: string;
  expiresAt: Date;
  verifiedAt: Date | null;
}

export interface EmailVerificationRepository {
  save(input: SaveEmailVerificationInput): Promise<void>;
  findByEmail(email: string): Promise<EmailVerificationRecord | null>;
  markUserAsVerified(userId: string): Promise<void>;
}
