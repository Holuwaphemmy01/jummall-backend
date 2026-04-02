import nodemailer from "nodemailer";

import type {
  MailProvider,
  SendEmailVerificationInput,
  SendPasswordResetEmailInput,
  SendWelcomeEmailInput
} from "../../ports/mail-provider";

export class SmtpMailProvider implements MailProvider {
  constructor(
    private readonly host: string = process.env.SMTP_HOST ?? "",
    private readonly port: number = Number(process.env.SMTP_PORT ?? 465),
    private readonly user: string = process.env.SMTP_USER ?? "",
    private readonly password: string = process.env.SMTP_PASSWORD ?? "",
    private readonly secure: boolean =
      (process.env.SMTP_SECURE ?? "true").toLowerCase() === "true",
    private readonly fromAddress: string = process.env.MAIL_FROM_ADDRESS ?? "",
    private readonly fromName: string = process.env.MAIL_FROM_NAME ?? "Jummall",
    private readonly testRecipientAddress: string =
      process.env.MAIL_TO_ADDRESS ?? process.env.MAIL_TO ?? ""
  ) {}

  async sendEmailVerification(
    input: SendEmailVerificationInput
  ): Promise<void> {
    const recipientName = input.firstName ?? "there";

    await this.sendMail({
      to: this.getRecipient(input.to),
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
  }

  async sendWelcomeEmail(input: SendWelcomeEmailInput): Promise<void> {
    const recipientName = input.firstName ?? "there";
    const subject =
      input.role === "buyer"
        ? "Welcome to Jummall Buyer"
        : "Welcome to Jummall Seller";
    const roleSpecificMessage =
      input.role === "buyer"
        ? "You can now explore products, save favorites, and complete your orders with confidence."
        : "Your seller account is ready. Complete your onboarding and KYC steps to start selling on Jummall.";

    await this.sendMail({
      to: this.getRecipient(input.to),
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
  }

  async sendPasswordResetEmail(
    input: SendPasswordResetEmailInput
  ): Promise<void> {
    const recipientName = input.firstName ?? "there";

    await this.sendMail({
      to: this.getRecipient(input.to),
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
  }

  private async sendMail(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    if (!this.host) {
      throw new Error("SMTP_HOST is not set.");
    }

    if (!this.user) {
      throw new Error("SMTP_USER is not set.");
    }

    if (!this.password) {
      throw new Error("SMTP_PASSWORD is not set.");
    }

    if (!this.fromAddress) {
      throw new Error("MAIL_FROM_ADDRESS is not set.");
    }

    const transporter = nodemailer.createTransport({
      host: this.host,
      port: this.port,
      secure: this.secure,
      auth: {
        user: this.user,
        pass: this.password
      }
    });

    await transporter.sendMail({
      from: this.getFrom(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text
    });
  }

  private getFrom(): string {
    return this.fromName
      ? `${this.fromName} <${this.fromAddress}>`
      : this.fromAddress;
  }

  private getRecipient(actualRecipient: string): string {
    return this.testRecipientAddress || actualRecipient;
  }
}
