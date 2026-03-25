import type { Pool } from "pg";

import databasePool from "../client";
import type {
  AuthenticationRepository,
  AuthUser
} from "../../../ports/authentication-repository";

interface AuthUserRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email: string;
  phone: string | null;
  password: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PostgresAuthenticationRepository
  implements AuthenticationRepository
{
  constructor(private readonly pool: Pool = databasePool) {}

  async findByEmail(email: string): Promise<AuthUser | null> {
    const result = await this.pool.query<AuthUserRow>(
      `
        SELECT
          "id",
          "firstName",
          "lastName",
          "username",
          "email",
          "phone",
          "password",
          "role",
          "createdAt",
          "updatedAt"
        FROM "User"
        WHERE "email" = $1
        LIMIT 1
      `,
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      phone: user.phone,
      passwordHash: user.password,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}
