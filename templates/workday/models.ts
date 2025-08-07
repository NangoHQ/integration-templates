import { z } from "zod";

export const Employee = z.object({
  id: z.string(),
  user_name: z.union([z.string(), z.null()]),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  active: z.boolean().optional(),
  email: z.string(),
  role: z.string(),
  department: z.string(),
  site: z.string(),
  country: z.union([z.string(), z.null()]).optional(),
  external_id: z.string().optional(),
  employment_relationship: z.string().optional(),
  phone_number: z.union([z.string(), z.null()])
});

export type Employee = z.infer<typeof Employee>;

export const Group = z.object({
  id: z.string(),
  active: z.boolean(),
  created_at: z.union([z.string(), z.null()]),
  name: z.string()
});

export type Group = z.infer<typeof Group>;

export const CompanyLocationState = z.object({
  name: z.string(),
  abbrev: z.string(),
  iso_code: z.string()
});

export type CompanyLocationState = z.infer<typeof CompanyLocationState>;

export const Location = z.object({
  id: z.string(),
  name: z.string(),
  description: z.union([z.string(), z.null()]),
  city: z.union([z.string(), z.null()]),
  state: z.union([CompanyLocationState, z.null()]),

  country: z.object({
    name: z.string(),
    iso_code: z.string()
  }),

  zip_code: z.string(),
  address: z.string(),
  phone_number: z.union([z.string(), z.null()])
});

export type Location = z.infer<typeof Location>;

export const Address = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  postalCode: z.string(),
  type: z.union([z.literal("WORK"), z.literal("HOME")])
});

export type Address = z.infer<typeof Address>;

export const WorkLocation = z.object({
  name: z.string(),
  type: z.union([z.literal("OFFICE"), z.literal("REMOTE"), z.literal("HYBRID")]),
  primaryAddress: Address.optional()
});

export type WorkLocation = z.infer<typeof WorkLocation>;

export const UnifiedAddress = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  type: z.union([z.literal("WORK"), z.literal("HOME")])
});

export type UnifiedAddress = z.infer<typeof UnifiedAddress>;

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
    id: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional()
  }).optional(),

  workLocation: z.object({
    name: z.string(),
    type: z.union([z.literal("OFFICE"), z.literal("REMOTE"), z.literal("HYBRID")]),
    primaryAddress: UnifiedAddress.optional()
  }),

  addresses: UnifiedAddress.array(),
  phones: Phone.array(),
  emails: Email.array(),
  providerSpecific: z.object({}).catchall(z.any()),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type StandardEmployee = z.infer<typeof StandardEmployee>;

export const SyncConfiguration = z.object({
    lagMinutes: z.number().optional()
});

export type SyncConfiguration = z.infer<typeof SyncConfiguration>;

export const models = {
  Employee: Employee,
  Group: Group,
  CompanyLocationState: CompanyLocationState,
  Location: Location,
  Address: Address,
  WorkLocation: WorkLocation,
  UnifiedAddress: UnifiedAddress,
  Phone: Phone,
  Email: Email,
  StandardEmployee: StandardEmployee
};
