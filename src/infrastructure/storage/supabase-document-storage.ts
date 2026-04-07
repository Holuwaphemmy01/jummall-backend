import type {
  DocumentStorage,
  UploadProductBrandImageInput,
  UploadProductCategoryImageInput,
  UploadProductImageInput,
  UploadSellerKycDocumentInput,
  UploadSliderImageInput,
  UploadedDocument
} from "../../ports/document-storage";

export class SupabaseDocumentStorage implements DocumentStorage {
  constructor(
    private readonly supabaseUrl: string = process.env.SUPABASE_URL ?? "",
    private readonly serviceRoleKey: string =
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    private readonly sellerKycBucketName: string =
      process.env.SUPABASE_STORAGE_BUCKET ?? "seller-kyc-documents",
    private readonly productImageBucketName: string =
      process.env.SUPABASE_PRODUCT_IMAGE_BUCKET ?? "product-images",
    private readonly productCategoryImageBucketName: string =
      process.env.SUPABASE_PRODUCT_CATEGORY_IMAGE_BUCKET ??
      "product-category-images",
    private readonly productBrandImageBucketName: string =
      process.env.SUPABASE_PRODUCT_BRAND_IMAGE_BUCKET ?? "product-brand-images",
    private readonly sliderImageBucketName: string =
      process.env.SUPABASE_SLIDER_IMAGE_BUCKET ?? "slider-images"
  ) {}

  async uploadSellerKycDocument(
    input: UploadSellerKycDocumentInput
  ): Promise<UploadedDocument> {
    if (!this.supabaseUrl) {
      throw new Error("SUPABASE_URL is not set.");
    }

    if (!this.serviceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
    }

    const storagePath = this.buildStoragePath(input);
    const uploadUrl = `${this.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${this.sellerKycBucketName}/${storagePath}`;

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        "Content-Type": input.mimeType,
        "x-upsert": "true"
      },
      body: new Uint8Array(input.fileContents)
    });

    if (!response.ok) {
      const errorResponse = await response.text();
      throw new Error(
        `Unable to upload seller KYC document to storage. ${errorResponse}`.trim()
      );
    }

    return {
      storagePath
    };
  }

  async uploadProductImage(
    input: UploadProductImageInput
  ): Promise<UploadedDocument> {
    if (!this.supabaseUrl) {
      throw new Error("SUPABASE_URL is not set.");
    }

    if (!this.serviceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
    }

    const storagePath = this.buildProductImageStoragePath(input);
    const uploadUrl = `${this.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${this.productImageBucketName}/${storagePath}`;

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        "Content-Type": input.mimeType,
        "x-upsert": "true"
      },
      body: new Uint8Array(input.fileContents)
    });

    if (!response.ok) {
      const errorResponse = await response.text();
      throw new Error(
        `Unable to upload product image to storage. ${errorResponse}`.trim()
      );
    }

    return {
      storagePath
    };
  }

  async uploadProductCategoryImage(
    input: UploadProductCategoryImageInput
  ): Promise<UploadedDocument> {
    if (!this.supabaseUrl) {
      throw new Error("SUPABASE_URL is not set.");
    }

    if (!this.serviceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
    }

    const storagePath = this.buildProductCategoryImageStoragePath(input);
    const uploadUrl = `${this.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${this.productCategoryImageBucketName}/${storagePath}`;

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        "Content-Type": input.mimeType,
        "x-upsert": "true"
      },
      body: new Uint8Array(input.fileContents)
    });

    if (!response.ok) {
      const errorResponse = await response.text();
      throw new Error(
        `Unable to upload product category image to storage. ${errorResponse}`.trim()
      );
    }

    return {
      storagePath
    };
  }

  async uploadProductBrandImage(
    input: UploadProductBrandImageInput
  ): Promise<UploadedDocument> {
    if (!this.supabaseUrl) {
      throw new Error("SUPABASE_URL is not set.");
    }

    if (!this.serviceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
    }

    const storagePath = this.buildProductBrandImageStoragePath(input);
    const uploadUrl = `${this.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${this.productBrandImageBucketName}/${storagePath}`;

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        "Content-Type": input.mimeType,
        "x-upsert": "true"
      },
      body: new Uint8Array(input.fileContents)
    });

    if (!response.ok) {
      const errorResponse = await response.text();
      throw new Error(
        `Unable to upload product brand image to storage. ${errorResponse}`.trim()
      );
    }

    return {
      storagePath
    };
  }

  async uploadSliderImage(
    input: UploadSliderImageInput
  ): Promise<UploadedDocument> {
    if (!this.supabaseUrl) {
      throw new Error("SUPABASE_URL is not set.");
    }

    if (!this.serviceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
    }

    const storagePath = this.buildSliderImageStoragePath(input);
    const uploadUrl = `${this.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${this.sliderImageBucketName}/${storagePath}`;

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        "Content-Type": input.mimeType,
        "x-upsert": "true"
      },
      body: new Uint8Array(input.fileContents)
    });

    if (!response.ok) {
      const errorResponse = await response.text();
      throw new Error(
        `Unable to upload slider image to storage. ${errorResponse}`.trim()
      );
    }

    return {
      storagePath
    };
  }

  private buildStoragePath(input: UploadSellerKycDocumentInput): string {
    const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");

    return [
      "seller-kyc",
      input.userId,
      input.documentType,
      `${Date.now()}-${sanitizedFileName}`
    ].join("/");
  }

  private buildProductImageStoragePath(input: UploadProductImageInput): string {
    const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");

    return [
      "products",
      input.sellerId,
      `${Date.now()}-${sanitizedFileName}`
    ].join("/");
  }

  private buildProductCategoryImageStoragePath(
    input: UploadProductCategoryImageInput
  ): string {
    const sanitizedCategoryName = input.categoryName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "category";
    const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");

    return [
      "product-categories",
      sanitizedCategoryName,
      `${Date.now()}-${sanitizedFileName}`
    ].join("/");
  }

  private buildProductBrandImageStoragePath(
    input: UploadProductBrandImageInput
  ): string {
    const sanitizedBrandName = input.brandName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "brand";
    const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");

    return [
      "product-brands",
      sanitizedBrandName,
      `${Date.now()}-${sanitizedFileName}`
    ].join("/");
  }

  private buildSliderImageStoragePath(input: UploadSliderImageInput): string {
    const sanitizedSliderTitle = input.sliderTitle
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "slider";
    const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");

    return [
      "sliders",
      sanitizedSliderTitle,
      `${Date.now()}-${sanitizedFileName}`
    ].join("/");
  }
}
