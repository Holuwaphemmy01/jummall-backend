import type {
  DocumentStorage,
  UploadSellerKycDocumentInput,
  UploadedDocument
} from "../../ports/document-storage";

export class SupabaseDocumentStorage implements DocumentStorage {
  constructor(
    private readonly supabaseUrl: string = process.env.SUPABASE_URL ?? "",
    private readonly serviceRoleKey: string =
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    private readonly bucketName: string =
      process.env.SUPABASE_STORAGE_BUCKET ?? "seller-kyc-documents"
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
    const uploadUrl = `${this.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${this.bucketName}/${storagePath}`;

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

  private buildStoragePath(input: UploadSellerKycDocumentInput): string {
    const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");

    return [
      "seller-kyc",
      input.userId,
      input.documentType,
      `${Date.now()}-${sanitizedFileName}`
    ].join("/");
  }
}
