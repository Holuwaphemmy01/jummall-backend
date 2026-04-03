import type { DocumentStorage } from "../../ports/document-storage";
import type {
  ProductCategoryRecord,
  ProductCategoryRepository
} from "../../ports/product-category-repository";
import { ProductCategoryError } from "./product-category-errors";
import {
  type ProductCategoryImageUploadInput,
  validateProductCategoryImage
} from "./product-category-image";

export interface CreateProductCategoryInput {
  name: string;
  description: string;
  deductionPercentage: number;
  image: ProductCategoryImageUploadInput;
}

export interface CreateProductCategoryUseCase {
  execute(input: CreateProductCategoryInput): Promise<ProductCategoryRecord>;
}

export class CreateProductCategory implements CreateProductCategoryUseCase {
  constructor(
    private readonly productCategoryRepository: ProductCategoryRepository,
    private readonly documentStorage: DocumentStorage
  ) {}

  async execute(
    input: CreateProductCategoryInput
  ): Promise<ProductCategoryRecord> {
    const existingCategory = await this.productCategoryRepository.findByName(
      input.name
    );

    if (existingCategory) {
      throw new ProductCategoryError(
        "Product category name already exists.",
        409,
        "name"
      );
    }

    validateProductCategoryImage(input.image);

    const uploadedImage = await this.documentStorage.uploadProductCategoryImage({
      categoryName: input.name,
      fileName: input.image.fileName,
      mimeType: input.image.mimeType,
      fileContents: input.image.fileContents
    });

    return this.productCategoryRepository.create({
      name: input.name,
      description: input.description,
      deductionPercentage: input.deductionPercentage,
      image: {
        storagePath: uploadedImage.storagePath,
        mimeType: input.image.mimeType,
        originalFileName: input.image.fileName
      }
    });
  }
}
