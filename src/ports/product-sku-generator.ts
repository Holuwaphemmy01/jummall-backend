export interface GenerateProductSkuInput {
  productName: string;
}

export interface ProductSkuGenerator {
  generate(input: GenerateProductSkuInput): Promise<string>;
}
