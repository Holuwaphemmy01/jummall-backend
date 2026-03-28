import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { DocumentStorage } from "../../ports/document-storage";
import type { ProductCategoryRepository } from "../../ports/product-category-repository";
import type {
  ProductRecord,
  ProductRepository
} from "../../ports/product-repository";
import type { SellerKycRepository } from "../../ports/seller-kyc-repository";

export interface UploadProductImageInput {
  fileName: string;
  mimeType: string;
  fileContents: Buffer;
}

export interface UploadProductInput {
  sellerId: string;
  categoryId: string;
  name: string;
  description: string;
  sku?: string;
  price: number;
  quantity: number;
  currency: string;
  condition: string;
  brand?: string;
  weightKg: number;
  images: UploadProductImageInput[];
}

export interface UploadProductUseCase {
  execute(input: UploadProductInput): Promise<ProductRecord>;
}

export class UploadProductError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "UploadProductError";
  }
}

const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class UploadProduct implements UploadProductUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly sellerKycRepository: SellerKycRepository,
    private readonly productCategoryRepository: ProductCategoryRepository,
    private readonly productRepository: ProductRepository,
    private readonly documentStorage: DocumentStorage
  ) {}

  async execute(input: UploadProductInput): Promise<ProductRecord> {
    const seller = await this.authenticationRepository.findById(input.sellerId);

    if (!seller) {
      throw new UploadProductError("Seller account not found.", 404, "seller_id");
    }

    if (seller.role !== "seller") {
      throw new UploadProductError(
        "Only sellers can upload products.",
        403,
        "seller_id"
      );
    }

    if (seller.accountStatus !== "verified") {
      throw new UploadProductError(
        "Seller account must be verified before uploading products.",
        403,
        "seller_id"
      );
    }

    const sellerKyc = await this.sellerKycRepository.findByUserId(input.sellerId);

    if (!sellerKyc || sellerKyc.status !== "approved") {
      throw new UploadProductError(
        "Seller KYC must be approved before uploading products.",
        403,
        "seller_id"
      );
    }

    const category = await this.productCategoryRepository.findById(input.categoryId);

    if (!category) {
      throw new UploadProductError("Product category not found.", 404, "category_id");
    }

    if (input.price <= 0) {
      throw new UploadProductError("Price must be greater than zero.", 400, "price");
    }

    if (input.quantity < 0) {
      throw new UploadProductError(
        "Quantity cannot be less than zero.",
        400,
        "quantity"
      );
    }

    if (input.weightKg <= 0) {
      throw new UploadProductError(
        "Weight must be greater than zero.",
        400,
        "weight_kg"
      );
    }

    if (input.images.length === 0) {
      throw new UploadProductError(
        "At least one product image is required.",
        400,
        "images"
      );
    }

    input.images.forEach((image, index) => {
      if (!ALLOWED_IMAGE_MIME_TYPES.has(image.mimeType)) {
        throw new UploadProductError(
          "Unsupported product image type.",
          400,
          `images.${index}.mime_type`
        );
      }
    });

    const uploadedImages = await Promise.all(
      input.images.map(async (image, index) => {
        const uploadedImage = await this.documentStorage.uploadProductImage({
          sellerId: input.sellerId,
          fileName: image.fileName,
          mimeType: image.mimeType,
          fileContents: image.fileContents
        });

        return {
          storagePath: uploadedImage.storagePath,
          mimeType: image.mimeType,
          originalFileName: image.fileName,
          position: index
        };
      })
    );

    return this.productRepository.create({
      sellerId: input.sellerId,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      sku: input.sku,
      price: input.price,
      quantity: input.quantity,
      currency: input.currency,
      condition: input.condition,
      brand: input.brand,
      weightKg: input.weightKg,
      images: uploadedImages
    });
  }
}
