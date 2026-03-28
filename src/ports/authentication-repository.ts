export interface AuthUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email: string;
  phone: string | null;
  passwordHash: string;
  role: string;
  accountStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticationRepository {
  findByEmail(email: string): Promise<AuthUser | null>;
  updatePassword(input: { userId: string; passwordHash: string }): Promise<void>;
}
