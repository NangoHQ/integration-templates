import { z } from "zod";

export const UserNamEntity = z.object({
  userName: z.string()
});

export type UserNamEntity = z.infer<typeof UserNamEntity>;

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

export const AWSCreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  userName: z.string().optional()
});

export type AWSCreateUser = z.infer<typeof AWSCreateUser>;

export const models = {
  UserNamEntity: UserNamEntity,
  SuccessResponse: SuccessResponse,
  ActionResponseError: ActionResponseError,
  User: User,
  CreateUser: CreateUser,
  AWSCreateUser: AWSCreateUser
};