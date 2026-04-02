import { afterEach, describe, expect, it } from "@jest/globals";

import { createMailProvider } from "../../../src/infrastructure/notification/create-mail-provider";
import { ResendMailProvider } from "../../../src/infrastructure/notification/resend-mail-provider";
import { SmtpMailProvider } from "../../../src/infrastructure/notification/smtp-mail-provider";

describe("createMailProvider", () => {
  const originalMailProvider = process.env.MAIL_PROVIDER;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalMailProvider === undefined) {
      delete process.env.MAIL_PROVIDER;
    } else {
      process.env.MAIL_PROVIDER = originalMailProvider;
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it("returns the SMTP provider when MAIL_PROVIDER is smtp", () => {
    process.env.MAIL_PROVIDER = "smtp";

    const mailProvider = createMailProvider();

    expect(mailProvider).toBeInstanceOf(SmtpMailProvider);
  });

  it("returns the Resend provider when MAIL_PROVIDER is resend", () => {
    process.env.MAIL_PROVIDER = "resend";

    const mailProvider = createMailProvider();

    expect(mailProvider).toBeInstanceOf(ResendMailProvider);
  });

  it("defaults to SMTP outside production when MAIL_PROVIDER is not set", () => {
    delete process.env.MAIL_PROVIDER;
    process.env.NODE_ENV = "development";

    const mailProvider = createMailProvider();

    expect(mailProvider).toBeInstanceOf(SmtpMailProvider);
  });

  it("defaults to Resend in production when MAIL_PROVIDER is not set", () => {
    delete process.env.MAIL_PROVIDER;
    process.env.NODE_ENV = "production";

    const mailProvider = createMailProvider();

    expect(mailProvider).toBeInstanceOf(ResendMailProvider);
  });

  it("throws for unsupported provider values", () => {
    process.env.MAIL_PROVIDER = "unknown";

    expect(() => createMailProvider()).toThrow(
      'Unsupported MAIL_PROVIDER value "unknown". Use "smtp" or "resend".'
    );
  });
});
