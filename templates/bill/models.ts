import { z } from "zod";

export const IdEntity = z.object({
  id: z.string()
});

export type IdEntity = z.infer<typeof IdEntity>;

export const SuccessResponse = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponse>;

export const ActionResponseError = z.object({
  message: z.string()
});

export type ActionResponseError = z.infer<typeof ActionResponseError>;

export const User = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string()
});

export type User = z.infer<typeof User>;

export const CreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string()
});

export type CreateUser = z.infer<typeof CreateUser>;

export const BillCreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  roleId: z.string().optional(),
  acceptTermsOfService: z.boolean().optional()
});

export type BillCreateUser = z.infer<typeof BillCreateUser>;

export const models = {
  IdEntity: IdEntity,
  SuccessResponse: SuccessResponse,
  ActionResponseError: ActionResponseError,
  User: User,
  CreateUser: CreateUser,
  BillCreateUser: BillCreateUser
};