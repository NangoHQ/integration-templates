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

export const PhoneNumber = z.object({
  type: z.union([z.literal("work"), z.literal("mobile"), z.literal("other")]),
  value: z.string()
});

export type PhoneNumber = z.infer<typeof PhoneNumber>;

export const Photo = z.object({
  type: z.union([z.literal("photo"), z.literal("thumbnail")]),
  value: z.string()
});

export type Photo = z.infer<typeof Photo>;

export const Address = z.object({
  type: z.literal("work"),
  streetAddress: z.string().optional(),
  locality: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional()
});

export type Address = z.infer<typeof Address>;

export const KeeperCreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  active: z.boolean().optional(),
  externalId: z.string().optional(),
  phoneNumbers: PhoneNumber.array(),
  photos: Photo.array(),
  addresses: Address.array(),
  title: z.string().optional()
});

export type KeeperCreateUser = z.infer<typeof KeeperCreateUser>;

export const models = {
  IdEntity: IdEntity,
  SuccessResponse: SuccessResponse,
  User: User,
  CreateUser: CreateUser,
  PhoneNumber: PhoneNumber,
  Photo: Photo,
  Address: Address,
  KeeperCreateUser: KeeperCreateUser
};