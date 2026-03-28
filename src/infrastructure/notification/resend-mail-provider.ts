import { Resend } from "resend";

import type {
  MailProvider,
  SendEmailVerificationInput,
  SendPasswordResetEmailInput,
  SendWelcomeEmailInput
} from "../../ports/mail-provider";

export class ResendMailProvider implements MailProvider {
  constructor(
    private readonly fromAddress: string = process.env.MAIL_FROM_ADDRESS ?? "",
    private readonly fromName: string = process.env.MAIL_FROM_NAME ?? "Jummall",
    private readonly apiKey: string = process.env.RESEND_API_KEY ?? ""
  ) {}

  async sendEmailVerification(
    input: SendEmailVerificationInput
  ): Promise<void> {
    if (!this.apiKey) {
      throw new Error("RESEND_API_KEY is not set.");
    }

    if (!this.fromAddress) {
      throw new Error("MAIL_FROM_ADDRESS is not set.");
    }

    const recipientName = input.firstName ?? "there";
    const from = this.fromName
      ? `${this.fromName} <${this.fromAddress}>`
      : this.fromAddress;
    const resend = new Resend(this.apiKey);

    const { error } = await resend.emails.send({
      from,
      to: [input.to],
      subject: "Verify your Jummall account",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <p>Hello ${recipientName},</p>
          <p>Your Jummall verification code is:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${input.code}</p>
          <p>This code will expire soon. If you did not request this, you can ignore this email.</p>
        </div>
      `,
      text: `Hello ${recipientName}, your Jummall verification code is ${input.code}.`
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async sendWelcomeEmail(input: SendWelcomeEmailInput): Promise<void> {
    if (!this.apiKey) {
      throw new Error("RESEND_API_KEY is not set.");
    }

    if (!this.fromAddress) {
      throw new Error("MAIL_FROM_ADDRESS is not set.");
    }

    const resend = new Resend(this.apiKey);
    const recipientName = input.firstName ?? "there";
    const from = this.fromName
      ? `${this.fromName} <${this.fromAddress}>`
      : this.fromAddress;
    const subject =
      input.role === "buyer"
        ? "Welcome to Jummall Buyer"
        : "Welcome to Jummall Seller";
    const roleSpecificMessage =
      input.role === "buyer"
        ? "You can now explore products, save favorites, and complete your orders with confidence."
        : "Your seller account is ready. Complete your onboarding and KYC steps to start selling on Jummall.";

    const { error } = await resend.emails.send({
      from,
      to: [input.to],
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <p>Hello ${recipientName},</p>
          <p>Welcome to Jummall.</p>
          <p>${roleSpecificMessage}</p>
        </div>
      `,
      text: `Hello ${recipientName}, welcome to Jummall. ${roleSpecificMessage}`
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async sendPasswordResetEmail(
    input: SendPasswordResetEmailInput
  ): Promise<void> {
    if (!this.apiKey) {
      throw new Error("RESEND_API_KEY is not set.");
    }

    if (!this.fromAddress) {
      throw new Error("MAIL_FROM_ADDRESS is not set.");
    }

    const resend = new Resend(this.apiKey);
    const recipientName = input.firstName ?? "there";
    const from = this.fromName
      ? `${this.fromName} <${this.fromAddress}>`
      : this.fromAddress;

    const { error } = await resend.emails.send({
      from,
      to: [input.to],
      subject: "Reset your Jummall password",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <p>Hello ${recipientName},</p>
          <p>Your Jummall password reset code is:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${input.code}</p>
          <p>If you did not request a password reset, you can ignore this email.</p>
        </div>
      `,
      text: `Hello ${recipientName}, your Jummall password reset code is ${input.code}.`
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}
