export interface FindExistingSellerIdentifiersInput {
  email: string;
  phone: string;
}

export interface ExistingSellerIdentifiers {
  email: boolean;
  phone: boolean;
}

export interface CreateSellerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passwordHash: string;
  accountType: "individual" | "business";
}

export interface SellerRecord {
  id: string;
  firstName: string;
  lastName: string;
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
