import { describe, expect, it, jest } from "@jest/globals";

import {
  RefreshAccessToken,
  RefreshAccessTokenError
} from "../../../src/application/auth/refresh-access-token";
import type {
  AuthenticationRepository,
  AuthUser
} from "../../../src/ports/authentication-repository";
import type {
  IssuedRefreshToken,
  RefreshTokenProvider
} from "../../../src/ports/refresh-token-provider";
import type {
  CreateRefreshTokenSessionInput,
  RefreshTokenSession,
  RefreshTokenSessionRepository,
  RevokeRefreshTokenSessionInput,
  RotateRefreshTokenSessionInput
} from "../../../src/ports/refresh-token-session-repository";
import type { TokenPayload, TokenSigner } from "../../../src/ports/token-signer";

class AuthenticationRepositoryDouble implements AuthenticationRepository {
  findByEmail = jest.fn<(email: string) => Promise<AuthUser | null>>().mockResolvedValue(null);

  findById = jest
    .fn<(userId: string) => Promise<AuthUser | null>>()
    .mockResolvedValue({
      id: "user-id",
      firstName: "John",
      lastName: "Doe",
      username: "john.doe",
      email: "john@example.com",
      phone: "+2348012345678",
      passwordHash: "stored-password-hash",
      role: "buyer",
      accountStatus: "verified",
      createdAt: new Date("2026-03-24T00:00:00.000Z"),
      updatedAt: new Date("2026-03-24T00:00:00.000Z")
    });

  updatePassword = jest
    .fn<(input: { userId: string; passwordHash: string }) => Promise<void>>()
    .mockResolvedValue();
}

class RefreshTokenProviderDouble implements RefreshTokenProvider {
  issue = jest.fn<() => Promise<IssuedRefreshToken>>().mockResolvedValue({
    token: "next-refresh-token",
    tokenHash: "next-refresh-token-hash",
    expiresAt: new Date("2026-05-01T00:00:00.000Z")
  });

  hash = jest
    .fn<(token: string) => Promise<string>>()
    .mockResolvedValue("current-refresh-token-hash");
}

class RefreshTokenSessionRepositoryDouble
  implements RefreshTokenSessionRepository
{
  create = jest
    .fn<(input: CreateRefreshTokenSessionInput) => Promise<RefreshTokenSession>>()
    .mockRejectedValue(new Error("Not implemented"));

  findActiveByTokenHash = jest
    .fn<(tokenHash: string) => Promise<RefreshTokenSession | null>>()
    .mockResolvedValue({
      id: "session-id",
      userId: "user-id",
      tokenHash: "current-refresh-token-hash",
      expiresAt: new Date("2026-04-24T00:00:00.000Z"),
      revokedAt: null,
      createdAt: new Date("2026-03-24T00:00:00.000Z"),
      updatedAt: new Date("2026-03-24T00:00:00.000Z")
    });

  rotate = jest
    .fn<(input: RotateRefreshTokenSessionInput) => Promise<void>>()
    .mockResolvedValue();

  revoke = jest
    .fn<(input: RevokeRefreshTokenSessionInput) => Promise<void>>()
    .mockResolvedValue();
}

class TokenSignerDouble implements TokenSigner {
  sign = jest
    .fn<(payload: TokenPayload) => Promise<string>>()
    .mockResolvedValue("next-access-token");
}

describe("RefreshAccessToken", () => {
  it("refreshes the session and returns a rotated token pair", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    const refreshTokenProvider = new RefreshTokenProviderDouble();
    const refreshTokenSessionRepository =
      new RefreshTokenSessionRepositoryDouble();
    const tokenSigner = new TokenSignerDouble();
    const refreshAccessToken = new RefreshAccessToken(
      authenticationRepository,
      refreshTokenProvider,
      refreshTokenSessionRepository,
      tokenSigner
    );

    const result = await refreshAccessToken.execute({
      refreshToken: "current-refresh-token"
    });

    expect(refreshTokenProvider.hash).toHaveBeenCalledWith("current-refresh-token");
    expect(refreshTokenSessionRepository.findActiveByTokenHash).toHaveBeenCalledWith(
      "current-refresh-token-hash"
    );
    expect(tokenSigner.sign).toHaveBeenCalledWith({
      sub: "user-id",
      email: "john@example.com",
      role: "buyer",
      sessionId: "session-id"
    });
    expect(refreshTokenSessionRepository.rotate).toHaveBeenCalledWith({
      sessionId: "session-id",
      tokenHash: "next-refresh-token-hash",
      expiresAt: new Date("2026-05-01T00:00:00.000Z")
    });
    expect(result).toMatchObject({
      accessToken: "next-access-token",
      refreshToken: "next-refresh-token",
      user: {
        id: "user-id",
        role: "buyer",
        accountStatus: "verified"
      }
    });
  });

  it("throws when the refresh token is not found", async () => {
    const refreshTokenSessionRepository =
      new RefreshTokenSessionRepositoryDouble();

    refreshTokenSessionRepository.findActiveByTokenHash.mockResolvedValue(null);

    const refreshAccessToken = new RefreshAccessToken(
      new AuthenticationRepositoryDouble(),
      new RefreshTokenProviderDouble(),
      refreshTokenSessionRepository,
      new TokenSignerDouble()
    );

    await expect(
      refreshAccessToken.execute({ refreshToken: "invalid-token" })
    ).rejects.toMatchObject({
      name: "RefreshAccessTokenError",
      message: "Invalid or expired refresh token.",
      statusCode: 401
    });
  });

  it("throws when the user no longer exists", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue(null);

    const refreshAccessToken = new RefreshAccessToken(
      authenticationRepository,
      new RefreshTokenProviderDouble(),
      new RefreshTokenSessionRepositoryDouble(),
      new TokenSignerDouble()
    );

    await expect(
      refreshAccessToken.execute({ refreshToken: "current-refresh-token" })
    ).rejects.toBeInstanceOf(RefreshAccessTokenError);
  });

  it("throws when the user is no longer verified", async () => {
    const authenticationRepository = new AuthenticationRepositoryDouble();
    authenticationRepository.findById.mockResolvedValue({
      id: "user-id",
      firstName: "John",
      lastName: "Doe",
      username: "john.doe",
      email: "john@example.com",
      phone: "+2348012345678",
      passwordHash: "stored-password-hash",
      role: "buyer",
      accountStatus: "not_verified",
      createdAt: new Date("2026-03-24T00:00:00.000Z"),
      updatedAt: new Date("2026-03-24T00:00:00.000Z")
    });

    const refreshAccessToken = new RefreshAccessToken(
      authenticationRepository,
      new RefreshTokenProviderDouble(),
      new RefreshTokenSessionRepositoryDouble(),
      new TokenSignerDouble()
    );

    await expect(
      refreshAccessToken.execute({ refreshToken: "current-refresh-token" })
    ).rejects.toBeInstanceOf(RefreshAccessTokenError);
  });

  it("propagates token hash failures", async () => {
    const refreshTokenProvider = new RefreshTokenProviderDouble();
    const hashError = new Error("hash failed");

    refreshTokenProvider.hash.mockRejectedValue(hashError);

    const refreshAccessToken = new RefreshAccessToken(
      new AuthenticationRepositoryDouble(),
      refreshTokenProvider,
      new RefreshTokenSessionRepositoryDouble(),
      new TokenSignerDouble()
    );

    await expect(
      refreshAccessToken.execute({ refreshToken: "current-refresh-token" })
    ).rejects.toThrow(hashError);
  });

  it("propagates token signing failures without rotating the session", async () => {
    const refreshTokenSessionRepository =
      new RefreshTokenSessionRepositoryDouble();
    const tokenSigner = new TokenSignerDouble();
    const signError = new Error("sign failed");

    tokenSigner.sign.mockRejectedValue(signError);

    const refreshAccessToken = new RefreshAccessToken(
      new AuthenticationRepositoryDouble(),
      new RefreshTokenProviderDouble(),
      refreshTokenSessionRepository,
      tokenSigner
    );

    await expect(
      refreshAccessToken.execute({ refreshToken: "current-refresh-token" })
    ).rejects.toThrow(signError);
    expect(refreshTokenSessionRepository.rotate).not.toHaveBeenCalled();
  });

  it("propagates session rotation failures", async () => {
    const refreshTokenSessionRepository =
      new RefreshTokenSessionRepositoryDouble();
    const rotateError = new Error("rotate failed");

    refreshTokenSessionRepository.rotate.mockRejectedValue(rotateError);

    const refreshAccessToken = new RefreshAccessToken(
      new AuthenticationRepositoryDouble(),
      new RefreshTokenProviderDouble(),
      refreshTokenSessionRepository,
      new TokenSignerDouble()
    );

    await expect(
      refreshAccessToken.execute({ refreshToken: "current-refresh-token" })
    ).rejects.toThrow(rotateError);
  });
});
