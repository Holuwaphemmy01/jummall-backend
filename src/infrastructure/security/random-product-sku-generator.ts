import { randomBytes } from "crypto";

import type {
  GenerateProductSkuInput,
  ProductSkuGenerator
} from "../../ports/product-sku-generator";

export class RandomProductSkuGenerator implements ProductSkuGenerator {
  async generate(input: GenerateProductSkuInput): Promise<string> {
    const normalizedBase =
      input.productName
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 24) || "PRODUCT";
    const suffix = randomBytes(3).toString("hex").toUpperCase();

    return `${normalizedBase}-${suffix}`;
  }
}
