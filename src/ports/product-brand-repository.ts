export interface ProductBrandRecord {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductBrandInput {
  name: string;
  description: string;
}

export interface UpdateProductBrandInput {
  brandId: string;
  name?: string;
  description?: string;
}

export interface ProductBrandRepository {
  create(input: CreateProductBrandInput): Promise<ProductBrandRecord>;
  findAll(): Promise<ProductBrandRecord[]>;
  findById(brandId: string): Promise<ProductBrandRecord | null>;
  findByName(name: string): Promise<ProductBrandRecord | null>;
  update(input: UpdateProductBrandInput): Promise<ProductBrandRecord | null>;
}
