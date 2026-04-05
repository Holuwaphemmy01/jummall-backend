export interface InventoryDecrementInput {
  productId: string;
  quantity: number;
}

export interface InventoryRepository {
  decrementAvailableQuantities(input: InventoryDecrementInput[]): Promise<void>;
}

