import type { RefreshTokenSessionRepository } from "../../ports/refresh-token-session-repository";
import type { TokenPayload } from "../../ports/token-signer";

export interface LogoutInput {
  authUser: TokenPayload;
}

export interface LogoutUseCase {
  execute(input: LogoutInput): Promise<void>;
}

export class LogoutError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "LogoutError";
  }
}

export class Logout implements LogoutUseCase {
  constructor(
    private readonly refreshTokenSessionRepository: RefreshTokenSessionRepository
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    if (!input.authUser.sessionId) {
      throw new LogoutError("Invalid or expired access token.", 401);
    }

    await this.refreshTokenSessionRepository.revoke({
      sessionId: input.authUser.sessionId,
      userId: input.authUser.sub
    });
  }
}
