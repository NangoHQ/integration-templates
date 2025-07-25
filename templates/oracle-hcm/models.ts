import { z } from "zod";

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

  addresses: UnifiedAddress.array().optional(),
  phones: Phone.array().optional(),
  emails: Email.array().optional(),
  providerSpecific: z.object({}).catchall(z.any()),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type StandardEmployee = z.infer<typeof StandardEmployee>;

export const OracleHcmAddress = z.object({
  addressLine1: z.union([z.string(), z.null()]).optional(),
  addressLine2: z.union([z.string(), z.null()]).optional(),
  townOrCity: z.union([z.string(), z.null()]).optional(),
  region2: z.union([z.string(), z.null()]).optional(),
  country: z.string().optional(),
  postalCode: z.union([z.string(), z.null()]).optional(),
  addressType: z.string().optional(),
  primaryFlag: z.boolean().optional()
});

export type OracleHcmAddress = z.infer<typeof OracleHcmAddress>;

export const OracleHcmPhone = z.object({
  phoneType: z.string().optional(),
  phoneNumber: z.string().optional(),
  primaryFlag: z.boolean().optional()
});

export type OracleHcmPhone = z.infer<typeof OracleHcmPhone>;

export const OracleHcmEmail = z.object({
  emailType: z.string().optional(),
  emailAddress: z.string().optional(),
  primaryFlag: z.boolean().optional()
});

export type OracleHcmEmail = z.infer<typeof OracleHcmEmail>;

export const Employee = z.object({
  id: z.string(),
  personNumber: z.string().optional(),
  displayName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  workEmail: z.string().optional(),
  title: z.string().optional(),
  departmentId: z.string().optional(),
  departmentName: z.string().optional(),
  assignmentStatusType: z.string().optional(),
  startDate: z.string().optional(),
  terminationDate: z.string().optional(),
  managerId: z.string().optional(),
  managerName: z.string().optional(),
  workLocationName: z.string().optional(),
  workLocationType: z.string().optional(),
  correspondenceLanguage: z.union([z.string(), z.null()]).optional(),
  bloodType: z.union([z.string(), z.null()]).optional(),
  dateOfBirth: z.union([z.string(), z.null()]).optional(),
  dateOfDeath: z.union([z.string(), z.null()]).optional(),
  countryOfBirth: z.union([z.string(), z.null()]).optional(),
  regionOfBirth: z.union([z.string(), z.null()]).optional(),
  townOfBirth: z.union([z.string(), z.null()]).optional(),
  applicantNumber: z.union([z.string(), z.null()]).optional(),
  createdBy: z.string().optional(),
  lastUpdatedBy: z.string().optional(),
  creationDate: z.string().optional(),
  lastUpdateDate: z.string().optional(),
  workLocationAddress: OracleHcmAddress.optional(),
  addresses: OracleHcmAddress.array().optional(),
  phones: OracleHcmPhone.array().optional(),
  emails: OracleHcmEmail.array().optional()
});

export type Employee = z.infer<typeof Employee>;

export const models = {
  UnifiedAddress: UnifiedAddress,
  Phone: Phone,
  Email: Email,
  StandardEmployee: StandardEmployee,
  OracleHcmAddress: OracleHcmAddress,
  OracleHcmPhone: OracleHcmPhone,
  OracleHcmEmail: OracleHcmEmail,
  Employee: Employee
};
