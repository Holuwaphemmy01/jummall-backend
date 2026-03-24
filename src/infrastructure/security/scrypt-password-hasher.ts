import { randomBytes, scrypt as scryptCallback } from "crypto";
import { promisify } from "util";

import type { PasswordHasher } from "../../ports/password-hasher";

const scrypt = promisify(scryptCallback);

export class ScryptPasswordHasher implements PasswordHasher {
  async hash(value: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const derivedKey = (await scrypt(value, salt, 64)) as Buffer;

    return `${salt}:${derivedKey.toString("hex")}`;
  }
}
