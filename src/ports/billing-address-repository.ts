export interface BillingAddressRecord {
  id: string;
  buyerId: string;
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  country: string;
  postalCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBillingAddressInput {
  buyerId: string;
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
}

export interface BillingAddressRepository {
  create(input: CreateBillingAddressInput): Promise<BillingAddressRecord>;
  findByBuyerId(buyerId: string): Promise<BillingAddressRecord[]>;
}
