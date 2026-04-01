import { describe, expect, it, jest } from "@jest/globals";

import { Logout, LogoutError } from "../../../src/application/auth/logout";
import type {
  CreateRefreshTokenSessionInput,
  RefreshTokenSession,
  RefreshTokenSessionRepository,
  RevokeRefreshTokenSessionInput,
  RotateRefreshTokenSessionInput
} from "../../../src/ports/refresh-token-session-repository";

class RefreshTokenSessionRepositoryDouble
  implements RefreshTokenSessionRepository
{
  create = jest
    .fn<(input: CreateRefreshTokenSessionInput) => Promise<RefreshTokenSession>>()
    .mockRejectedValue(new Error("Not implemented"));

  findActiveByTokenHash = jest
    .fn<(tokenHash: string) => Promise<RefreshTokenSession | null>>()
    .mockResolvedValue(null);

  rotate = jest
    .fn<(input: RotateRefreshTokenSessionInput) => Promise<void>>()
    .mockResolvedValue();

  revoke = jest
    .fn<(input: RevokeRefreshTokenSessionInput) => Promise<void>>()
    .mockResolvedValue();
}

describe("Logout", () => {
  it("revokes the current authenticated session", async () => {
    const refreshTokenSessionRepository =
      new RefreshTokenSessionRepositoryDouble();
    const logout = new Logout(refreshTokenSessionRepository);

    await logout.execute({
      authUser: {
        sub: "user-id",
        email: "john@example.com",
        role: "buyer",
        sessionId: "session-id"
      }
    });

    expect(refreshTokenSessionRepository.revoke).toHaveBeenCalledWith({
      sessionId: "session-id",
      userId: "user-id"
    });
  });

  it("throws when the authenticated token does not carry a session id", async () => {
    const logout = new Logout(new RefreshTokenSessionRepositoryDouble());

    await expect(
      logout.execute({
        authUser: {
          sub: "user-id",
          email: "john@example.com",
          role: "buyer"
        }
      })
    ).rejects.toMatchObject({
      name: "LogoutError",
      message: "Invalid or expired access token.",
      statusCode: 401
    });
  });

  it("propagates session repository failures", async () => {
    const refreshTokenSessionRepository =
      new RefreshTokenSessionRepositoryDouble();
    const revokeError = new Error("revoke failed");

    refreshTokenSessionRepository.revoke.mockRejectedValue(revokeError);

    const logout = new Logout(refreshTokenSessionRepository);

    await expect(
      logout.execute({
        authUser: {
          sub: "user-id",
          email: "john@example.com",
          role: "buyer",
          sessionId: "session-id"
        }
      })
    ).rejects.toThrow(revokeError);
  });

  it("returns a LogoutError instance for missing session id", async () => {
    const logout = new Logout(new RefreshTokenSessionRepositoryDouble());

    await expect(
      logout.execute({
        authUser: {
          sub: "user-id",
          email: "john@example.com",
          role: "buyer"
        }
      })
    ).rejects.toBeInstanceOf(LogoutError);
  });
});
