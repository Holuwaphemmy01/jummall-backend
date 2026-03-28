export interface ProductCategoryRecord {
  id: string;
  name: string;
  description: string;
  deductionPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductCategoryInput {
  name: string;
  description: string;
  deductionPercentage: number;
}

export interface UpdateProductCategoryInput {
  categoryId: string;
  name?: string;
  description?: string;
  deductionPercentage?: number;
}

export interface ProductCategoryRepository {
  create(input: CreateProductCategoryInput): Promise<ProductCategoryRecord>;
  findAll(): Promise<ProductCategoryRecord[]>;
  findById(categoryId: string): Promise<ProductCategoryRecord | null>;
  findByName(name: string): Promise<ProductCategoryRecord | null>;
  update(input: UpdateProductCategoryInput): Promise<ProductCategoryRecord | null>;
}
