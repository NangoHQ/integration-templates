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

export const PhoneNumber = z.object({
  type: z.union([z.literal("work"), z.literal("mobile"), z.literal("other")]),
  value: z.string()
});

export type PhoneNumber = z.infer<typeof PhoneNumber>;

export const Contact = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phoneNumbers: PhoneNumber.array().optional(),
  company: z.string(),
  jobTitle: z.string(),
  notes: z.string()
});

export type Contact = z.infer<typeof Contact>;

export const CreateContact = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phoneNumbers: PhoneNumber.array(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  notes: z.string().optional()
});

export type CreateContact = z.infer<typeof CreateContact>;

export const CompanyInfo = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),

  serviceInfo: z.object({
    brand: z.object({
      id: z.string(),
      name: z.string()
    }),

    servicePlan: z.object({
      id: z.string(),
      name: z.string()
    })
  }),

  mainNumber: z.string(),

  operator: z.object({
    id: z.string(),
    extensionNumber: z.string()
  })
});

export type CompanyInfo = z.infer<typeof CompanyInfo>;

export const CreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string()
});

export type CreateUser = z.infer<typeof CreateUser>;

export const Photo = z.object({
  type: z.literal("photo"),
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

export const RingCentralCreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  active: z.boolean().optional(),
  externalId: z.string().optional(),
  phoneNumbers: PhoneNumber.array(),
  photos: Photo.array(),
  addresses: Address.array(),
  title: z.string().optional(),

  "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": z.object({
    department: z.string()
  }).optional()
});

export type RingCentralCreateUser = z.infer<typeof RingCentralCreateUser>;

export const models = {
  IdEntity: IdEntity,
  SuccessResponse: SuccessResponse,
  User: User,
  PhoneNumber: PhoneNumber,
  Contact: Contact,
  CreateContact: CreateContact,
  CompanyInfo: CompanyInfo,
  CreateUser: CreateUser,
  Photo: Photo,
  Address: Address,
  RingCentralCreateUser: RingCentralCreateUser
};