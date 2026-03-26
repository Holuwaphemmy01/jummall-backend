import type { NextFunction, Request, Response } from "express";

import type { TokenPayload } from "../../../ports/token-signer";
import type { TokenVerifier } from "../../../ports/token-verifier";

export interface AuthenticatedUser extends TokenPayload {}

export function createAuthMiddleware(
  tokenVerifier: TokenVerifier,
  requiredRole?: string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authorizationHeader = req.header("authorization");

    if (!authorizationHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication is required."
      });
    }

    const token = authorizationHeader.slice("Bearer ".length).trim();

    if (!token) {
      return res.status(401).json({
        message: "Authentication is required."
      });
    }

    try {
      const authUser = await tokenVerifier.verify(token);

      if (requiredRole && authUser.role !== requiredRole) {
        return res.status(403).json({
          message: "You are not authorized to perform this action."
        });
      }

      res.locals.authUser = authUser;
      return next();
    } catch {
      return res.status(401).json({
        message: "Invalid or expired access token."
      });
    }
  };
}
