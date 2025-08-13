import { z } from "zod";

export const SuccessResponse = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponse>;

export const IdEntity = z.object({
  id: z.string()
});

export type IdEntity = z.infer<typeof IdEntity>;

export const GustoCreateEmployee = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  middleInitial: z.string().optional(),
  preferredFirstName: z.string().optional(),
  dateOfBirth: z.string(),
  ssn: z.string().optional(),
  selfOnboarding: z.boolean().optional()
});

export type GustoCreateEmployee = z.infer<typeof GustoCreateEmployee>;

export const GustoCreateEmployeeResponse = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string()
});

export type GustoCreateEmployeeResponse = z.infer<typeof GustoCreateEmployeeResponse>;

export const GustoUpdateEmployee = z.object({
  id: z.string(),
  version: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  middleInitial: z.string().optional(),
  preferredFirstName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  ssn: z.string().optional(),
  twoPercentShareholder: z.boolean().optional()
});

export type GustoUpdateEmployee = z.infer<typeof GustoUpdateEmployee>;

export const GustoUpdateEmployeeResponse = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string()
});

export type GustoUpdateEmployeeResponse = z.infer<typeof GustoUpdateEmployeeResponse>;

export const GustoTerminateEmployee = z.object({
  id: z.string(),
  effectiveDate: z.string().optional(),
  runTerminationPayroll: z.boolean().optional()
});

export type GustoTerminateEmployee = z.infer<typeof GustoTerminateEmployee>;

export const CustomField = z.object({
    id: z.string(),
    company_custom_field_id: z.string(),
    name: z.string(),
    description: z.string(),
    type: z.string(),
    value: z.string(),
    selection_options: z.array(z.string()).optional()
});

export type CustomField = z.infer<typeof CustomField>;

export const GustoEmployee = z.object({
  id: z.string(),
  uuid: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  work_email: z.string(),
  phone: z.string(),
  department: z.string(),
  department_uuid: z.string(),
  manager_uuid: z.string(),
  version: z.string(),
  terminated: z.boolean(),
  onboarded: z.boolean(),
  onboarding_status: z.string(),
  date_of_birth: z.string(),
  has_ssn: z.boolean(),
  custom_fields: z.array(CustomField),

  jobs: z.array(z.object({
    id: z.string(),
    title: z.string(),
    hire_date: z.string(),
    payment_unit: z.string(),
    primary: z.boolean()
  }))
});

export type GustoEmployee = z.infer<typeof GustoEmployee>;

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
    id: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional()
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
  SuccessResponse: SuccessResponse,
  IdEntity: IdEntity,
  GustoCreateEmployee: GustoCreateEmployee,
  GustoCreateEmployeeResponse: GustoCreateEmployeeResponse,
  GustoUpdateEmployee: GustoUpdateEmployee,
  GustoUpdateEmployeeResponse: GustoUpdateEmployeeResponse,
  GustoTerminateEmployee: GustoTerminateEmployee,
  GustoEmployee: GustoEmployee,
  Address: Address,
  Phone: Phone,
  Email: Email,
  StandardEmployee: StandardEmployee
};
