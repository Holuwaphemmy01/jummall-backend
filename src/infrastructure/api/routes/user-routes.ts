import { Router } from "express";

import type { GetUserProfileUseCase } from "../../../application/user/get-user-profile";
import { GetUserProfileError } from "../../../application/user/get-user-profile";
import type { AuthenticatedUser } from "../middleware/create-auth-middleware";

interface UserRouterDependencies {
  getUserProfile: GetUserProfileUseCase;
}

export default function createUserRouter({
  getUserProfile
}: UserRouterDependencies) {
  const userRouter = Router();

  userRouter.get("/profile", async (_req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const profile = await getUserProfile.execute({
        userId: authUser.sub
      });

      return res.status(200).json({
        message: "User profile fetched successfully.",
        data: {
          id: profile.id,
          first_name: profile.firstName,
          last_name: profile.lastName,
          username: profile.username,
          email: profile.email,
          phone: profile.phone,
          role: profile.role,
          account_status: profile.accountStatus,
          account_type: profile.accountType,
          kyc_status: profile.kycStatus
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof GetUserProfileError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to fetch user profile."
      });
    }
  });

  return userRouter;
}
