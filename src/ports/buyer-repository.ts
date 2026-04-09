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

export interface FindExistingBuyerPhoneByAnotherUserInput {
  buyerId: string;
  phone: string;
}

export interface UpdateBuyerProfileInput {
  buyerId: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
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
  isPhoneInUseByAnotherUser(
    input: FindExistingBuyerPhoneByAnotherUserInput
  ): Promise<boolean>;
  createBuyer(input: CreateBuyerInput): Promise<BuyerRecord>;
  updateBuyerProfile(input: UpdateBuyerProfileInput): Promise<BuyerRecord | null>;
}
