import type { DocumentStorage } from "../../ports/document-storage";
import type {
  ProductBrandRecord,
  ProductBrandRepository
} from "../../ports/product-brand-repository";
import { ProductBrandError } from "./product-brand-errors";
import {
  type ProductBrandImageUploadInput,
  validateProductBrandImage
} from "./product-brand-image";

export interface UpdateProductBrandInput {
  brandId: string;
  name?: string;
  description?: string;
  image?: ProductBrandImageUploadInput;
}

export interface UpdateProductBrandUseCase {
  execute(input: UpdateProductBrandInput): Promise<ProductBrandRecord>;
}

export class UpdateProductBrand implements UpdateProductBrandUseCase {
  constructor(
    private readonly productBrandRepository: ProductBrandRepository,
    private readonly documentStorage: DocumentStorage
  ) {}

  async execute(input: UpdateProductBrandInput): Promise<ProductBrandRecord> {
    const existingBrand = await this.productBrandRepository.findById(
      input.brandId
    );

    if (!existingBrand) {
      throw new ProductBrandError("Product brand not found.", 404);
    }

    if (input.name) {
      const brandWithSameName = await this.productBrandRepository.findByName(
        input.name
      );

      if (brandWithSameName && brandWithSameName.id !== input.brandId) {
        throw new ProductBrandError(
          "Product brand name already exists.",
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
      validateProductBrandImage(input.image);

      const imageUpload = await this.documentStorage.uploadProductBrandImage({
        brandName: input.name ?? existingBrand.name,
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

    const updatedBrand = await this.productBrandRepository.update({
      brandId: input.brandId,
      name: input.name,
      description: input.description,
      image: uploadedImage
    });

    if (!updatedBrand) {
      throw new ProductBrandError("Product brand not found.", 404);
    }

    return updatedBrand;
  }
}
