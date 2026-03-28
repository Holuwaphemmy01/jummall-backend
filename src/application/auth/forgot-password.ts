import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { MailProvider } from "../../ports/mail-provider";
import type { PasswordResetRepository } from "../../ports/password-reset-repository";
import type { VerificationCodeGenerator } from "../../ports/verification-code-generator";

export interface ForgotPasswordInput {
  email: string;
}

export interface ForgotPasswordUseCase {
  execute(input: ForgotPasswordInput): Promise<void>;
}

export class ForgotPassword {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly verificationCodeGenerator: VerificationCodeGenerator,
    private readonly mailProvider: MailProvider,
    private readonly codeTtlMinutes: number = 15
  ) {}

  async execute(input: ForgotPasswordInput): Promise<void> {
    const user = await this.authenticationRepository.findByEmail(input.email);

    if (!user) {
      return;
    }

    const code = await this.verificationCodeGenerator.generate();
    const expiresAt = new Date(Date.now() + this.codeTtlMinutes * 60 * 1000);

    await this.passwordResetRepository.save({
      userId: user.id,
      code,
      expiresAt
    });

    await this.mailProvider.sendPasswordResetEmail({
      to: user.email,
      firstName: user.firstName,
      code
    });
  }
}
