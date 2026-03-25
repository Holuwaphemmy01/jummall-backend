import type { PasswordHasher } from "../../ports/password-hasher";
import type { SellerRecord, SellerRepository } from "../../ports/seller-repository";
import { InitiateEmailVerification } from "../auth/initiate-email-verification";
import { SendWelcomeEmail } from "../notification/send-welcome-email";

export interface RegisterSellerInput {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  accountType: "individual" | "business";
}

export interface RegisterSellerUseCase {
  execute(input: RegisterSellerInput): Promise<SellerRecord>;
}

export class RegisterSellerError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "RegisterSellerError";
  }
}

export class RegisterSeller implements RegisterSellerUseCase {
  constructor(
    private readonly sellerRepository: SellerRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly initiateEmailVerification: InitiateEmailVerification,
    private readonly sendWelcomeEmail: SendWelcomeEmail
  ) {}

  async execute(input: RegisterSellerInput): Promise<SellerRecord> {
    if (input.password !== input.confirmPassword) {
      throw new RegisterSellerError(
        "Confirm password does not match password.",
        400,
        "confirm_password"
      );
    }

    const existingIdentifiers =
      await this.sellerRepository.findExistingIdentifiers({
        email: input.email,
        username: input.username,
        phone: input.phone
      });

    if (existingIdentifiers.email) {
      throw new RegisterSellerError("Email is already in use.", 409, "email");
    }

    if (existingIdentifiers.username) {
      throw new RegisterSellerError("Username is already in use.", 409, "username");
    }

    if (existingIdentifiers.phone) {
      throw new RegisterSellerError("Phone number is already in use.", 409, "phone_number");
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    const seller = await this.sellerRepository.createSeller({
      firstName: input.firstName,
      lastName: input.lastName,
      username: input.username,
      email: input.email,
      phone: input.phone,
      passwordHash,
      accountType: input.accountType
    });

    await this.initiateEmailVerification.execute({
      userId: seller.id,
      email: seller.email,
      firstName: seller.firstName
    });

    await this.sendWelcomeEmail.execute({
      to: seller.email,
      firstName: seller.firstName,
      role: "seller"
    });

    return seller;
  }
}
