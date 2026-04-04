export type ProductStatus = "pending_review" | "approved" | "rejected";

export interface ProductImageRecord {
  id: string;
  productId: string;
  storagePath: string;
  mimeType: string;
  originalFileName: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductRecord {
  id: string;
  sellerId: string;
  categoryId: string;
  categoryName?: string | null;
  brandId: string | null;
  brandName: string | null;
  name: string;
  description: string;
  sku: string | null;
  price: number;
  quantity: number;
  currency: string;
  condition: string;
  weightKg: number;
  status: ProductStatus;
  reviewNote: string | null;
  reviewedAt: Date | null;
  images: ProductImageRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductImageInput {
  storagePath: string;
  mimeType: string;
  originalFileName: string;
  position: number;
}

export interface CreateProductInput {
  sellerId: string;
  categoryId: string;
  brandId?: string;
  name: string;
  description: string;
  sku?: string;
  price: number;
  quantity: number;
  currency: string;
  condition: string;
  weightKg: number;
  images: CreateProductImageInput[];
}

export interface UpdateProductStatusInput {
  productId: string;
  status: ProductStatus;
  reviewNote?: string;
  reviewedAt?: Date;
}

export interface ProductRepository {
  create(input: CreateProductInput): Promise<ProductRecord>;
  findById(productId: string): Promise<ProductRecord | null>;
  findBySellerId(sellerId: string): Promise<ProductRecord[]>;
  findPendingReview(): Promise<ProductRecord[]>;
  updateStatus(input: UpdateProductStatusInput): Promise<ProductRecord | null>;
}
