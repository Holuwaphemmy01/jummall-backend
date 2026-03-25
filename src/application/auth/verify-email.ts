import type { EmailVerificationRepository } from "../../ports/email-verification-repository";

export interface VerifyEmailInput {
  email: string;
  code: string;
}

export interface VerifyEmailResult {
  email: string;
  accountStatus: "verified";
}

export interface VerifyEmailUseCase {
  execute(input: VerifyEmailInput): Promise<VerifyEmailResult>;
}

export class VerifyEmailError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "VerifyEmailError";
  }
}

export class VerifyEmail implements VerifyEmailUseCase {
  constructor(
    private readonly emailVerificationRepository: EmailVerificationRepository
  ) {}

  async execute(input: VerifyEmailInput): Promise<VerifyEmailResult> {
    const verification = await this.emailVerificationRepository.findByEmail(
      input.email
    );

    if (!verification) {
      throw new VerifyEmailError("Verification request not found.", 404, "email");
    }

    if (verification.accountStatus === "verified") {
      throw new VerifyEmailError("Account is already verified.", 409, "email");
    }

    if (verification.status !== "active") {
      throw new VerifyEmailError("Invalid verification code.", 400, "code");
    }

    if (verification.code !== input.code) {
      throw new VerifyEmailError("Invalid verification code.", 400, "code");
    }

    if (verification.expiresAt.getTime() < Date.now()) {
      await this.emailVerificationRepository.markVerificationAsExpired(
        verification.id
      );
      throw new VerifyEmailError("Verification code has expired.", 400, "code");
    }

    await this.emailVerificationRepository.markVerificationAsUsed({
      verificationId: verification.id,
      userId: verification.userId
    });

    return {
      email: verification.email,
      accountStatus: "verified"
    };
  }
}
