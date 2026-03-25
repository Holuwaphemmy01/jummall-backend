import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { PasswordHasher } from "../../ports/password-hasher";
import type { TokenSigner } from "../../ports/token-signer";

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginUserProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email: string;
  phone: string | null;
  role: string;
  accountStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginResult {
  accessToken: string;
  user: LoginUserProfile;
}

export interface LoginUseCase {
  execute(input: LoginInput): Promise<LoginResult>;
}

export class LoginError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "LoginError";
  }
}

export class Login implements LoginUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenSigner: TokenSigner
  ) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const user = await this.authenticationRepository.findByEmail(input.email);

    if (!user) {
      throw new LoginError("Invalid email or password.", 401);
    }

    const passwordMatches = await this.passwordHasher.compare(
      input.password,
      user.passwordHash
    );

    if (!passwordMatches) {
      throw new LoginError("Invalid email or password.", 401);
    }

    if (user.accountStatus !== "verified") {
      throw new LoginError("Account is not verified.", 403);
    }

    const accessToken = await this.tokenSigner.sign({
      sub: user.id,
      email: user.email,
      role: user.role
    });

    return {
      accessToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    };
  }
}
