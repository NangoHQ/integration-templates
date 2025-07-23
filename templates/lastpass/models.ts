import { z } from "zod";

export const EmailEntity = z.object({
  email: z.string()
});

export type EmailEntity = z.infer<typeof EmailEntity>;

export const SuccessResponse = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponse>;

export const ActionResponseError = z.object({
  message: z.string()
});

export type ActionResponseError = z.infer<typeof ActionResponseError>;

export const CreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string()
});

export type CreateUser = z.infer<typeof CreateUser>;

export const LastPassCreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  groups: z.string().array().optional(),
  duousername: z.string().optional(),
  securidusername: z.string().optional(),
  password: z.string().optional(),
  password_reset_required: z.boolean().optional()
});

export type LastPassCreateUser = z.infer<typeof LastPassCreateUser>;

export const User = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string()
});

export type User = z.infer<typeof User>;

export const models = {
  EmailEntity: EmailEntity,
  SuccessResponse: SuccessResponse,
  ActionResponseError: ActionResponseError,
  CreateUser: CreateUser,
  LastPassCreateUser: LastPassCreateUser,
  User: User
};
