import { z } from "zod";

export const IdEntity = z.object({
  id: z.string()
});

export type IdEntity = z.infer<typeof IdEntity>;

export const SuccessResponse = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponse>;

export const User = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string()
});

export type User = z.infer<typeof User>;

export const CreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string()
});

export type CreateUser = z.infer<typeof CreateUser>;

export const Perimeter81CreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  idpType: z.string().optional(),
  accessGroups: z.string().optional().array(),
  emailVerified: z.boolean().optional(),
  inviteMessage: z.string().optional(),
  origin: z.string().optional(),

  profileData: z.object({
    roleName: z.string().optional(),
    phone: z.string().optional(),
    icon: z.string().optional(),
    origin: z.string().optional()
  }).optional()
});

export type Perimeter81CreateUser = z.infer<typeof Perimeter81CreateUser>;

export const models = {
  IdEntity: IdEntity,
  SuccessResponse: SuccessResponse,
  User: User,
  CreateUser: CreateUser,
  Perimeter81CreateUser: Perimeter81CreateUser
};