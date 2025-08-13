import { z } from "zod";

export const EmailEntity = z.object({
  email: z.string()
});

export type EmailEntity = z.infer<typeof EmailEntity>;

export const SuccessResponse = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponse>;

export const User = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  __raw: z.any()
});

export type User = z.infer<typeof User>;

export const models = {
  EmailEntity: EmailEntity,
  SuccessResponse: SuccessResponse,
  User: User
};