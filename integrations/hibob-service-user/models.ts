import { z } from "zod";

export const HibobWork = z.object({
  title: z.string().optional(),

  department: z.object({
    id: z.string(),
    name: z.string()
  }).optional(),

  employmentType: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  terminationDate: z.string().optional(),

  reportsTo: z.object({
    id: z.string(),
    firstName: z.string(),
    surname: z.string(),
    email: z.string()
  }).optional(),

  site: z.string().optional(),
  siteType: z.string().optional(),

  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
    postalCode: z.string()
  }).optional(),

  customFields: z.object({}).catchall(z.any()).optional()
});

export type HibobWork = z.infer<typeof HibobWork>;

export const HibobAddress = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  postalCode: z.string(),
  type: z.string()
});

export type HibobAddress = z.infer<typeof HibobAddress>;

export const HibobPersonal = z.object({
  addresses: HibobAddress.array().optional(),
  workPhone: z.string().optional(),
  homePhone: z.string().optional(),
  mobilePhone: z.string().optional(),
  email: z.string().optional()
});

export type HibobPersonal = z.infer<typeof HibobPersonal>;

export const HibobAbout = z.object({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
}).catchall(z.any());

export type HibobAbout = z.infer<typeof HibobAbout>;

export const HibobEmployee = z.object({
  id: z.string(),
  firstName: z.string(),
  surname: z.string(),
  email: z.string(),
  displayName: z.string(),
  work: HibobWork.optional(),
  personal: HibobPersonal.optional(),
  about: HibobAbout.optional()
});

export type HibobEmployee = z.infer<typeof HibobEmployee>;

export const Address = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  type: z.union([z.literal("WORK"), z.literal("HOME")])
});

export type Address = z.infer<typeof Address>;

export const Phone = z.object({
  type: z.union([z.literal("WORK"), z.literal("HOME"), z.literal("MOBILE")]),
  number: z.string()
});

export type Phone = z.infer<typeof Phone>;

export const Email = z.object({
  type: z.union([z.literal("WORK"), z.literal("PERSONAL")]),
  address: z.string()
});

export type Email = z.infer<typeof Email>;

export const StandardEmployee = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  displayName: z.string(),
  employeeNumber: z.string().optional(),
  title: z.string().optional(),

  department: z.object({
    id: z.string(),
    name: z.string()
  }),

  employmentType: z.union([
    z.literal("FULL_TIME"),
    z.literal("PART_TIME"),
    z.literal("CONTRACTOR"),
    z.literal("INTERN"),
    z.literal("TEMPORARY"),
    z.literal("OTHER")
  ]),

  employmentStatus: z.union([
    z.literal("ACTIVE"),
    z.literal("TERMINATED"),
    z.literal("ON_LEAVE"),
    z.literal("SUSPENDED"),
    z.literal("PENDING")
  ]),

  startDate: z.string(),
  terminationDate: z.string().optional(),

  manager: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string()
  }).optional(),

  workLocation: z.object({
    name: z.string(),
    type: z.union([z.literal("OFFICE"), z.literal("REMOTE"), z.literal("HYBRID")]),

    primaryAddress: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional(),
      type: z.union([z.literal("WORK"), z.literal("HOME")])
    }).optional()
  }),

  addresses: Address.array(),
  phones: Phone.array(),
  emails: Email.array(),
  providerSpecific: z.object({}).catchall(z.any()),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type StandardEmployee = z.infer<typeof StandardEmployee>;

export const models = {
  HibobWork: HibobWork,
  HibobAddress: HibobAddress,
  HibobPersonal: HibobPersonal,
  HibobAbout: HibobAbout,
  HibobEmployee: HibobEmployee,
  Address: Address,
  Phone: Phone,
  Email: Email,
  StandardEmployee: StandardEmployee
};
