import type {
  AuthenticationRepository,
  AuthUser
} from "../../ports/authentication-repository";
import type {
  SellerAccountType,
  SellerKycRepository,
  SellerKycStatus
} from "../../ports/seller-kyc-repository";

export interface UserProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email: string;
  phone: string | null;
  role: string;
  accountStatus: string;
  accountType: SellerAccountType | null;
  kycStatus: SellerKycStatus | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetUserProfileInput {
  userId: string;
}

export interface GetUserProfileUseCase {
  execute(input: GetUserProfileInput): Promise<UserProfile>;
}

export class GetUserProfileError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "GetUserProfileError";
  }
}

export class GetUserProfile implements GetUserProfileUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly sellerKycRepository: SellerKycRepository
  ) {}

  async execute(input: GetUserProfileInput): Promise<UserProfile> {
    const user = await this.authenticationRepository.findById(input.userId);

    if (!user) {
      throw new GetUserProfileError("User profile not found.", 404, "user_id");
    }

    if (user.role !== "buyer" && user.role !== "seller") {
      throw new GetUserProfileError(
        "Only buyer and seller accounts can access this profile.",
        403,
        "user_id"
      );
    }

    return this.enrichUserProfile(user);
  }

  private async enrichUserProfile(user: AuthUser): Promise<UserProfile> {
    if (user.role !== "seller") {
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        accountStatus: user.accountStatus,
        accountType: null,
        kycStatus: null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    }

    const sellerKyc = await this.sellerKycRepository.findByUserId(user.id);

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      accountStatus: user.accountStatus,
      accountType: sellerKyc?.accountType ?? null,
      kycStatus: sellerKyc?.status ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}
