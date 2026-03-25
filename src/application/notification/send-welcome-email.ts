import type { MailProvider } from "../../ports/mail-provider";

export interface SendWelcomeEmailInput {
  to: string;
  firstName: string | null;
  role: "buyer" | "seller";
}

export class SendWelcomeEmail {
  constructor(private readonly mailProvider: MailProvider) {}

  async execute(input: SendWelcomeEmailInput): Promise<void> {
    await this.mailProvider.sendWelcomeEmail({
      to: input.to,
      firstName: input.firstName,
      role: input.role
    });
  }
}
