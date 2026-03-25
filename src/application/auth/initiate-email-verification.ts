import type { EmailVerificationRepository } from "../../ports/email-verification-repository";
import type { MailProvider } from "../../ports/mail-provider";
import type { VerificationCodeGenerator } from "../../ports/verification-code-generator";

export interface InitiateEmailVerificationInput {
  userId: string;
  email: string;
  firstName: string | null;
}

export class InitiateEmailVerification {
  constructor(
    private readonly emailVerificationRepository: EmailVerificationRepository,
    private readonly verificationCodeGenerator: VerificationCodeGenerator,
    private readonly mailProvider: MailProvider,
    private readonly codeTtlMinutes: number = 15
  ) {}

  async execute(input: InitiateEmailVerificationInput): Promise<void> {
    const code = await this.verificationCodeGenerator.generate();
    const expiresAt = new Date(Date.now() + this.codeTtlMinutes * 60 * 1000);

    await this.emailVerificationRepository.save({
      userId: input.userId,
      code,
      expiresAt
    });

    await this.mailProvider.sendEmailVerification({
      to: input.email,
      firstName: input.firstName,
      code
    });
  }
}
