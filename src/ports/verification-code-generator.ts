export interface VerificationCodeGenerator {
  generate(): Promise<string>;
}
