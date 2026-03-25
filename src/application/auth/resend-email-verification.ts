import { InitiateEmailVerification } from "./initiate-email-verification";
import type { EmailVerificationRepository } from "../../ports/email-verification-repository";

export interface ResendEmailVerificationInput {
  email: string;
}

export interface ResendEmailVerificationResult {
  email: string;
}

export interface ResendEmailVerificationUseCase {
  execute(
    input: ResendEmailVerificationInput
  ): Promise<ResendEmailVerificationResult>;
}

export class ResendEmailVerificationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "ResendEmailVerificationError";
  }
}

export class ResendEmailVerification
  implements ResendEmailVerificationUseCase
{
  constructor(
    private readonly emailVerificationRepository: EmailVerificationRepository,
    private readonly initiateEmailVerification: InitiateEmailVerification,
    private readonly cooldownMs: number = 60 * 1000,
    private readonly now: () => number = () => Date.now()
  ) {}

  async execute(
    input: ResendEmailVerificationInput
  ): Promise<ResendEmailVerificationResult> {
    const verification = await this.emailVerificationRepository.findByEmail(
      input.email
    );

    if (!verification) {
      throw new ResendEmailVerificationError(
        "Verification request not found.",
        404,
        "email"
      );
    }

    if (verification.accountStatus === "verified") {
      throw new ResendEmailVerificationError(
        "Account is already verified.",
        409,
        "email"
      );
    }

    const timeSinceLastSend = this.now() - verification.createdAt.getTime();

    if (timeSinceLastSend < this.cooldownMs) {
      throw new ResendEmailVerificationError(
        "Please wait at least 1 minute before requesting another verification email.",
        429,
        "email"
      );
    }

    await this.initiateEmailVerification.execute({
      userId: verification.userId,
      email: verification.email,
      firstName: verification.firstName
    });

    return {
      email: verification.email
    };
  }
}
