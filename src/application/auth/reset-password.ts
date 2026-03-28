import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { PasswordHasher } from "../../ports/password-hasher";
import type { PasswordResetRepository } from "../../ports/password-reset-repository";

export interface ResetPasswordInput {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordUseCase {
  execute(input: ResetPasswordInput): Promise<void>;
}

export class ResetPasswordError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "ResetPasswordError";
  }
}

export class ResetPassword implements ResetPasswordUseCase {
  constructor(
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  async execute(input: ResetPasswordInput): Promise<void> {
    if (input.password !== input.confirmPassword) {
      throw new ResetPasswordError(
        "Password confirmation does not match password.",
        400,
        "confirm_password"
      );
    }

    const passwordReset = await this.passwordResetRepository.findByEmailAndCode(
      input.email,
      input.code
    );

    if (!passwordReset) {
      throw new ResetPasswordError("Invalid or expired password reset code.", 400, "code");
    }

    if (passwordReset.status !== "active") {
      throw new ResetPasswordError("Invalid or expired password reset code.", 400, "code");
    }

    if (passwordReset.expiresAt.getTime() <= Date.now()) {
      await this.passwordResetRepository.markAsExpired(passwordReset.id);
      throw new ResetPasswordError("Invalid or expired password reset code.", 400, "code");
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    await this.authenticationRepository.updatePassword({
      userId: passwordReset.userId,
      passwordHash
    });

    await this.passwordResetRepository.markAsUsed(passwordReset.id);
  }
}
