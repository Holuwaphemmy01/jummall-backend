import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { RefreshTokenProvider } from "../../ports/refresh-token-provider";
import type { RefreshTokenSessionRepository } from "../../ports/refresh-token-session-repository";
import type { TokenSigner } from "../../ports/token-signer";
import type { LoginUserProfile } from "./login";

export interface RefreshAccessTokenInput {
  refreshToken: string;
}

export interface RefreshAccessTokenResult {
  accessToken: string;
  refreshToken: string;
  user: LoginUserProfile;
}

export interface RefreshAccessTokenUseCase {
  execute(input: RefreshAccessTokenInput): Promise<RefreshAccessTokenResult>;
}

export class RefreshAccessTokenError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "RefreshAccessTokenError";
  }
}

export class RefreshAccessToken implements RefreshAccessTokenUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly refreshTokenProvider: RefreshTokenProvider,
    private readonly refreshTokenSessionRepository: RefreshTokenSessionRepository,
    private readonly tokenSigner: TokenSigner
  ) {}

  async execute(
    input: RefreshAccessTokenInput
  ): Promise<RefreshAccessTokenResult> {
    const tokenHash = await this.refreshTokenProvider.hash(input.refreshToken);
    const session =
      await this.refreshTokenSessionRepository.findActiveByTokenHash(tokenHash);

    if (!session) {
      throw new RefreshAccessTokenError("Invalid or expired refresh token.", 401);
    }

    const user = await this.authenticationRepository.findById(session.userId);

    if (!user || user.accountStatus !== "verified") {
      throw new RefreshAccessTokenError("Invalid or expired refresh token.", 401);
    }

    const issuedRefreshToken = await this.refreshTokenProvider.issue();
    const accessToken = await this.tokenSigner.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id
    });

    await this.refreshTokenSessionRepository.rotate({
      sessionId: session.id,
      tokenHash: issuedRefreshToken.tokenHash,
      expiresAt: issuedRefreshToken.expiresAt
    });

    return {
      accessToken,
      refreshToken: issuedRefreshToken.token,
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
