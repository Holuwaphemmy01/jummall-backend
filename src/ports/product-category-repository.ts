export interface ProductCategoryImageRecord {
  storagePath: string;
  mimeType: string;
  originalFileName: string;
}

export interface ProductCategoryRecord {
  id: string;
  name: string;
  description: string;
  deductionPercentage: number;
  image: ProductCategoryImageRecord | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductCategoryInput {
  name: string;
  description: string;
  deductionPercentage: number;
  image?: ProductCategoryImageRecord | null;
}

export interface UpdateProductCategoryInput {
  categoryId: string;
  name?: string;
  description?: string;
  deductionPercentage?: number;
  image?: ProductCategoryImageRecord;
}

export interface ProductCategoryRepository {
  create(input: CreateProductCategoryInput): Promise<ProductCategoryRecord>;
  findAll(): Promise<ProductCategoryRecord[]>;
  findById(categoryId: string): Promise<ProductCategoryRecord | null>;
  findByName(name: string): Promise<ProductCategoryRecord | null>;
  update(input: UpdateProductCategoryInput): Promise<ProductCategoryRecord | null>;
}
