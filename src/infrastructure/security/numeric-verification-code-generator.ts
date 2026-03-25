import { randomInt } from "crypto";

import type { VerificationCodeGenerator } from "../../ports/verification-code-generator";

export class NumericVerificationCodeGenerator
  implements VerificationCodeGenerator
{
  async generate(): Promise<string> {
    return randomInt(100000, 1000000).toString();
  }
}
