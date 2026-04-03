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

export interface UpdateProductCategoryInput {
  categoryId: string;
  name?: string;
  description?: string;
  deductionPercentage?: number;
  image?: ProductCategoryImageUploadInput;
}

export interface UpdateProductCategoryUseCase {
  execute(input: UpdateProductCategoryInput): Promise<ProductCategoryRecord>;
}

export class UpdateProductCategory implements UpdateProductCategoryUseCase {
  constructor(
    private readonly productCategoryRepository: ProductCategoryRepository,
    private readonly documentStorage: DocumentStorage
  ) {}

  async execute(
    input: UpdateProductCategoryInput
  ): Promise<ProductCategoryRecord> {
    const existingCategory = await this.productCategoryRepository.findById(
      input.categoryId
    );

    if (!existingCategory) {
      throw new ProductCategoryError("Product category not found.", 404);
    }

    if (input.name && input.name !== existingCategory.name) {
      const categoryWithSameName =
        await this.productCategoryRepository.findByName(input.name);

      if (categoryWithSameName) {
        throw new ProductCategoryError(
          "Product category name already exists.",
          409,
          "name"
        );
      }
    }

    let uploadedImage:
      | {
          storagePath: string;
          mimeType: string;
          originalFileName: string;
        }
      | undefined;

    if (input.image) {
      validateProductCategoryImage(input.image);

      const imageUpload = await this.documentStorage.uploadProductCategoryImage({
        categoryName: input.name ?? existingCategory.name,
        fileName: input.image.fileName,
        mimeType: input.image.mimeType,
        fileContents: input.image.fileContents
      });

      uploadedImage = {
        storagePath: imageUpload.storagePath,
        mimeType: input.image.mimeType,
        originalFileName: input.image.fileName
      };
    }

    const updatedCategory = await this.productCategoryRepository.update({
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      deductionPercentage: input.deductionPercentage,
      image: uploadedImage
    });

    if (!updatedCategory) {
      throw new ProductCategoryError("Product category not found.", 404);
    }

    return updatedCategory;
  }
}
