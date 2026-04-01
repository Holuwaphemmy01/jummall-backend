export interface CreateSuperAdminInput {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
}

export interface MarkUserAsVerifiedInput {
  userId: string;
}

export interface SuperAdminRepository {
  createSuperAdmin(input: CreateSuperAdminInput): Promise<void>;
  markUserAsVerified(input: MarkUserAsVerifiedInput): Promise<void>;
}
