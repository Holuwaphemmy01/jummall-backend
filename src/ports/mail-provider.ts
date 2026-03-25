export interface SendEmailVerificationInput {
  to: string;
  firstName: string | null;
  code: string;
}

export interface MailProvider {
  sendEmailVerification(input: SendEmailVerificationInput): Promise<void>;
}
