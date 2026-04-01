import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

const sendMock: jest.Mock<(typeof Promise.resolve<{ error: null }>)> = jest.fn();

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: sendMock
    }
  }))
}));

import { ResendMailProvider } from "../../../src/infrastructure/notification/resend-mail-provider";

describe("ResendMailProvider", () => {
  const originalMailTo = process.env.MAIL_TO;
  const originalMailToAddress = process.env.MAIL_TO_ADDRESS;

  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ error: null });
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
    const mailProvider = new ResendMailProvider(
      "onboarding@resend.dev",
      "Jummall",
      "re_test_key"
    );

    await mailProvider.sendEmailVerification({
      to: "buyer@example.com",
      firstName: "John",
      code: "123456"
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Jummall <onboarding@resend.dev>",
        to: ["buyer@example.com"],
        subject: "Verify your Jummall account"
      })
    );
  });

  it("uses MAIL_TO_ADDRESS as a temporary recipient override when configured", async () => {
    process.env.MAIL_TO_ADDRESS = "noreply@jummall.com";
    const mailProvider = new ResendMailProvider(
      "onboarding@resend.dev",
      "Jummall",
      "re_test_key"
    );

    await mailProvider.sendWelcomeEmail({
      to: "buyer@example.com",
      firstName: "John",
      role: "buyer"
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["noreply@jummall.com"],
        subject: "Welcome to Jummall Buyer"
      })
    );
  });

  it("supports MAIL_TO for compatibility with existing temporary env setup", async () => {
    process.env.MAIL_TO = "noreply@jummall.com";
    const mailProvider = new ResendMailProvider(
      "onboarding@resend.dev",
      "Jummall",
      "re_test_key"
    );

    await mailProvider.sendPasswordResetEmail({
      to: "buyer@example.com",
      firstName: "John",
      code: "654321"
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["noreply@jummall.com"],
        subject: "Reset your Jummall password"
      })
    );
  });
});
