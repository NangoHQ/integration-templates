import { z } from "zod";

export const Employee = z.object({
  id: z.string(),
  personIdExternal: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  preferredName: z.string(),
  gender: z.string(),
  nationality: z.string(),
  maritalStatus: z.union([z.string(), z.null()]),
  dateOfBirth: z.union([z.string(), z.null()]),
  countryOfBirth: z.union([z.string(), z.null()]),
  createdDateTime: z.string(),
  lastModifiedDateTime: z.string()
});

export type Employee = z.infer<typeof Employee>;

export const Location = z.object({
  id: z.string(),
  externalCode: z.string(),
  name: z.string(),
  description: z.union([z.string(), z.null()]),
  status: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  timezone: z.string(),
  createdDateTime: z.string(),
  lastModifiedDateTime: z.string(),
  country: z.string(),
  state: z.union([z.string(), z.null()]),
  city: z.union([z.string(), z.null()]),
  zipCode: z.union([z.string(), z.null()]),
  addressLine1: z.union([z.string(), z.null()]),
  addressLine2: z.union([z.string(), z.null()])
});

export type Location = z.infer<typeof Location>;

export const Group = z.object({
  id: z.string(),
  name: z.string(),
  name_localized: z.string(),
  name_en_US: z.string(),
  name_defaultValue: z.string(),
  description: z.union([z.string(), z.null()]),
  startDate: z.string(),
  endDate: z.string(),
  parent: z.union([z.string(), z.null()]),
  costCenter: z.union([z.string(), z.null()]),
  headOfUnit: z.union([z.string(), z.null()]),
  status: z.string(),
  createdDateTime: z.string(),
  lastModifiedDateTime: z.string(),
  entityUUID: z.string()
});

export type Group = z.infer<typeof Group>;

export const Person = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string()
});

export type Person = z.infer<typeof Person>;

export const Address = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  postalCode: z.string(),
  type: z.union([z.literal("HOME"), z.literal("WORK")])
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
  employeeNumber: z.string(),
  title: z.string(),

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
  terminationType: z.string().optional(),
  manager: Person,

  workLocation: z.object({
    name: z.string(),
    type: z.union([z.literal("OFFICE"), z.literal("REMOTE"), z.literal("HYBRID")]),
    primaryAddress: Address
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
  Employee: Employee,
  Location: Location,
  Group: Group,
  Person: Person,
  Address: Address,
  Phone: Phone,
  Email: Email,
  StandardEmployee: StandardEmployee
};