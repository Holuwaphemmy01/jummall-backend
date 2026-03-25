export interface SaveEmailVerificationInput {
  userId: string;
  code: string;
  expiresAt: Date;
}

export interface EmailVerificationRecord {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  accountStatus: string;
  code: string;
  status: string;
  expiresAt: Date;
  verifiedAt: Date | null;
  createdAt: Date;
}

export interface EmailVerificationRepository {
  save(input: SaveEmailVerificationInput): Promise<void>;
  findByEmail(email: string): Promise<EmailVerificationRecord | null>;
  markVerificationAsUsed(input: {
    verificationId: string;
    userId: string;
  }): Promise<void>;
  markVerificationAsExpired(verificationId: string): Promise<void>;
}
