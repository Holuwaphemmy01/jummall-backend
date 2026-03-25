export interface FindExistingSellerIdentifiersInput {
  email: string;
  username: string;
  phone: string;
}

export interface ExistingSellerIdentifiers {
  email: boolean;
  username: boolean;
  phone: boolean;
}

export interface CreateSellerInput {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  passwordHash: string;
  accountType: "individual" | "business";
}

export interface SellerRecord {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  accountType: "individual" | "business";
  kycStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SellerRepository {
  findExistingIdentifiers(
    input: FindExistingSellerIdentifiersInput
  ): Promise<ExistingSellerIdentifiers>;
  createSeller(input: CreateSellerInput): Promise<SellerRecord>;
}
