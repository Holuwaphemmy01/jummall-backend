import type { BuyerRepository, BuyerRecord } from "../../ports/buyer-repository";
import type { PasswordHasher } from "../../ports/password-hasher";
import { InitiateEmailVerification } from "../auth/initiate-email-verification";
import { SendWelcomeEmail } from "../notification/send-welcome-email";

export interface RegisterBuyerInput {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  phone: string;
  passwordConfirmation: string;
}

export interface RegisterBuyerUseCase {
  execute(input: RegisterBuyerInput): Promise<BuyerRecord>;
}

export class RegisterBuyerError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "RegisterBuyerError";
  }
}

export class RegisterBuyer implements RegisterBuyerUseCase {
  constructor(
    private readonly buyerRepository: BuyerRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly initiateEmailVerification: InitiateEmailVerification,
    private readonly sendWelcomeEmail: SendWelcomeEmail
  ) {}

  async execute(input: RegisterBuyerInput): Promise<BuyerRecord> {
    if (input.password !== input.passwordConfirmation) {
      throw new RegisterBuyerError(
        "Password confirmation does not match password.",
        400,
        "password_confirmation"
      );
    }

    const existingIdentifiers =
      await this.buyerRepository.findExistingIdentifiers({
        email: input.email,
        username: input.username,
        phone: input.phone
      });

    if (existingIdentifiers.email) {
      throw new RegisterBuyerError("Email is already in use.", 409, "email");
    }

    if (existingIdentifiers.username) {
      throw new RegisterBuyerError("Username is already in use.", 409, "username");
    }

    if (existingIdentifiers.phone) {
      throw new RegisterBuyerError("Phone is already in use.", 409, "phone");
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    const buyer = await this.buyerRepository.createBuyer({
      firstName: input.firstName,
      lastName: input.lastName,
      username: input.username,
      email: input.email,
      phone: input.phone,
      passwordHash
    });

    await this.initiateEmailVerification.execute({
      userId: buyer.id,
      email: buyer.email,
      firstName: buyer.firstName
    });

    await this.sendWelcomeEmail.execute({
      to: buyer.email,
      firstName: buyer.firstName,
      role: "buyer"
    });

    return buyer;
  }
}
