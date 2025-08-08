import { z } from "zod";

export const SuccessResponse = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponse>;

export const IdEntity = z.object({
  id: z.number()
});

export type IdEntity = z.infer<typeof IdEntity>;

export const User = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  active: z.boolean().optional()
});

export type User = z.infer<typeof User>;

export const CreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string()
});

export type CreateUser = z.infer<typeof CreateUser>;

export const UpdateUserInput = z.object({
  id: z.number(),
  email: z.union([z.string(), z.null()]),
  first_name: z.union([z.string(), z.null()]),
  last_name: z.union([z.string(), z.null()]),
  is_group_manager: z.union([z.boolean(), z.null()]),
  locale: z.union([z.string(), z.null()]),
  is_superuser: z.union([z.boolean(), z.null()])
});

export type UpdateUserInput = z.infer<typeof UpdateUserInput>;

export const models = {
  SuccessResponse: SuccessResponse,
  IdEntity: IdEntity,
  User: User,
  CreateUser: CreateUser,
  UpdateUserInput: UpdateUserInput
};
