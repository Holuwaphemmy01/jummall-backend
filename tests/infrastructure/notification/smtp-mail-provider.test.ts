import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

const sendMailMock = jest
  .fn<(...args: unknown[]) => Promise<unknown>>()
  .mockResolvedValue({});
const createTransportMock = jest
  .fn<(...args: unknown[]) => { sendMail: typeof sendMailMock }>()
  .mockImplementation(() => ({
    sendMail: sendMailMock
  }));

jest.mock("nodemailer", () => ({
  __esModule: true,
  default: {
    createTransport: createTransportMock
  }
}));

import { SmtpMailProvider } from "../../../src/infrastructure/notification/smtp-mail-provider";

describe("SmtpMailProvider", () => {
  const originalMailTo = process.env.MAIL_TO;
  const originalMailToAddress = process.env.MAIL_TO_ADDRESS;

  beforeEach(() => {
    createTransportMock.mockClear();
    sendMailMock.mockClear();
    sendMailMock.mockResolvedValue({});
    delete process.env.MAIL_TO;
    delete process.env.MAIL_TO_ADDRESS;
  });

  afterEach(() => {
    if (originalMailTo === undefined) {
      delete process.env.MAIL_TO;
    } else {
      process.env.MAIL_TO = originalMailTo;
    }

    if (originalMailToAddress === undefined) {
      delete process.env.MAIL_TO_ADDRESS;
    } else {
      process.env.MAIL_TO_ADDRESS = originalMailToAddress;
    }
  });

  it("sends to the actual recipient when no test recipient override is configured", async () => {
    const mailProvider = new SmtpMailProvider(
      "mail.privateemail.com",
      465,
      "noreply@jummall.com",
      "smtp-password",
      true,
      "noreply@jummall.com",
      "Jummall"
    );

    await mailProvider.sendEmailVerification({
      to: "buyer@example.com",
      firstName: "John",
      code: "123456"
    });

    expect(createTransportMock).toHaveBeenCalledWith({
      host: "mail.privateemail.com",
      port: 465,
      secure: true,
      auth: {
        user: "noreply@jummall.com",
        pass: "smtp-password"
      }
    });
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Jummall <noreply@jummall.com>",
        to: "buyer@example.com",
        subject: "Verify your Jummall account"
      })
    );
  });

  it("uses MAIL_TO_ADDRESS as a temporary recipient override when configured", async () => {
    process.env.MAIL_TO_ADDRESS = "noreply@jummall.com";
    const mailProvider = new SmtpMailProvider(
      "mail.privateemail.com",
      465,
      "noreply@jummall.com",
      "smtp-password",
      true,
      "noreply@jummall.com",
      "Jummall"
    );

    await mailProvider.sendWelcomeEmail({
      to: "buyer@example.com",
      firstName: "John",
      role: "buyer"
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "noreply@jummall.com",
        subject: "Welcome to Jummall Buyer"
      })
    );
  });

  it("supports MAIL_TO for compatibility with existing temporary env setup", async () => {
    process.env.MAIL_TO = "noreply@jummall.com";
    const mailProvider = new SmtpMailProvider(
      "mail.privateemail.com",
      465,
      "noreply@jummall.com",
      "smtp-password",
      true,
      "noreply@jummall.com",
      "Jummall"
    );

    await mailProvider.sendPasswordResetEmail({
      to: "buyer@example.com",
      firstName: "John",
      code: "654321"
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "noreply@jummall.com",
        subject: "Reset your Jummall password"
      })
    );
  });

  it("throws when SMTP host is missing", async () => {
    const mailProvider = new SmtpMailProvider(
      "",
      465,
      "noreply@jummall.com",
      "smtp-password",
      true,
      "noreply@jummall.com",
      "Jummall"
    );

    await expect(
      mailProvider.sendEmailVerification({
        to: "buyer@example.com",
        firstName: "John",
        code: "123456"
      })
    ).rejects.toThrow("SMTP_HOST is not set.");
    expect(createTransportMock).not.toHaveBeenCalled();
  });
});
