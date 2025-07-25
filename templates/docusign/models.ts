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

export const DocuSignCreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  userName: z.string().optional(),
  title: z.string().optional(),
  phoneNumber: z.string().optional(),
  company: z.string().optional(),
  countryCode: z.string().optional(),
  activationAccessCode: z.string().optional(),

  settings: z.object({
    language: z.string().optional(),
    timeZone: z.string().optional()
  }).optional(),

  userStatus: z.string().optional()
});

export type DocuSignCreateUser = z.infer<typeof DocuSignCreateUser>;

export const models = {
  IdEntity: IdEntity,
  SuccessResponse: SuccessResponse,
  User: User,
  CreateUser: CreateUser,
  DocuSignCreateUser: DocuSignCreateUser
};