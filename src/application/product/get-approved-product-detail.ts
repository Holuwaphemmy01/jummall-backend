import type { ProductCatalogRepository } from "../../ports/product-catalog-repository";
import type { ProductRecord } from "../../ports/product-repository";

export interface GetApprovedProductDetailInput {
  productId: string;
}

export interface GetApprovedProductDetailUseCase {
  execute(input: GetApprovedProductDetailInput): Promise<ProductRecord>;
}

export class GetApprovedProductDetailError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "GetApprovedProductDetailError";
  }
}

export class GetApprovedProductDetail
  implements GetApprovedProductDetailUseCase
{
  constructor(private readonly productCatalogRepository: ProductCatalogRepository) {}

  async execute(
    input: GetApprovedProductDetailInput
  ): Promise<ProductRecord> {
    const productId = input.productId.trim();

    if (!productId) {
      throw new GetApprovedProductDetailError(
        "Product id is required.",
        400,
        "productId"
      );
    }

    const product = await this.productCatalogRepository.findApprovedById(productId);

    if (!product) {
      throw new GetApprovedProductDetailError("Product not found.", 404);
    }

    return product;
  }
}
