export interface FindExistingBuyerIdentifiersInput {
  email: string;
  username: string;
  phone: string;
}

export interface ExistingBuyerIdentifiers {
  email: boolean;
  username: boolean;
  phone: boolean;
}

export interface CreateBuyerInput {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  passwordHash: string;
}

export interface BuyerRecord {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  accountStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BuyerRepository {
  findExistingIdentifiers(
    input: FindExistingBuyerIdentifiersInput
  ): Promise<ExistingBuyerIdentifiers>;
  createBuyer(input: CreateBuyerInput): Promise<BuyerRecord>;
}
