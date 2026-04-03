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

export interface CreateProductBrandInput {
  name: string;
  description: string;
  image: ProductBrandImageUploadInput;
}

export interface CreateProductBrandUseCase {
  execute(input: CreateProductBrandInput): Promise<ProductBrandRecord>;
}

export class CreateProductBrand implements CreateProductBrandUseCase {
  constructor(
    private readonly productBrandRepository: ProductBrandRepository,
    private readonly documentStorage: DocumentStorage
  ) {}

  async execute(input: CreateProductBrandInput): Promise<ProductBrandRecord> {
    const existingBrand = await this.productBrandRepository.findByName(input.name);

    if (existingBrand) {
      throw new ProductBrandError("Product brand name already exists.", 409, "name");
    }

    validateProductBrandImage(input.image);

    const uploadedImage = await this.documentStorage.uploadProductBrandImage({
      brandName: input.name,
      fileName: input.image.fileName,
      mimeType: input.image.mimeType,
      fileContents: input.image.fileContents
    });

    return this.productBrandRepository.create({
      name: input.name,
      description: input.description,
      image: {
        storagePath: uploadedImage.storagePath,
        mimeType: input.image.mimeType,
        originalFileName: input.image.fileName
      }
    });
  }
}
