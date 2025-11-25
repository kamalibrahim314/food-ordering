import { Router } from "express";

import * as authController from "./auth.controller.js";
import * as authSchema from "./auth.validation.js";

import { validate } from "../../middleware/validation.js";
import { authentication } from "../../middleware/authentication.js";
import { TokenType } from "../../utils/token.js";

const authRouter = Router();

authRouter.post('/register', validate(authSchema.signUpSchema), authController.register);
authRouter.post("/verify-otp", validate(authSchema.verifyOtpSchema), authController.verifyOtp);
authRouter.post('/login', validate(authSchema.signInSchema), authController.login);

authRouter.post("/logout", authentication(), authController.logout);
authRouter.post("/refresh", authentication(TokenType.refresh), authController.refresh);

authRouter.post("/forgotPassword", validate(authSchema.forgetPasswordSchema), authController.forgotPassword);
authRouter.post("/verifyResetCode", validate(authSchema.verifyResetCodeSchema), authController.verifyResetCode);
authRouter.post("/resetPassword", validate(authSchema.resetPasswordSchema), authController.resetPassword);

authRouter.get("/me", authentication(), authController.getMe);

export default authRouter;