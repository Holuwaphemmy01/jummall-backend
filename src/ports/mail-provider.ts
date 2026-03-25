export interface SendEmailVerificationInput {
  to: string;
  firstName: string | null;
  code: string;
}

export interface SendWelcomeEmailInput {
  to: string;
  firstName: string | null;
  role: "buyer" | "seller";
}

export interface MailProvider {
  sendEmailVerification(input: SendEmailVerificationInput): Promise<void>;
  sendWelcomeEmail(input: SendWelcomeEmailInput): Promise<void>;
}
