import { z } from "zod";

export const Option = z.object({
  id: z.number(),
  name: z.string()
});

export type Option = z.infer<typeof Option>;

export const BamboohrField = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  alias: z.string().optional(),
  options: z.array(Option).optional()
});

export type BamboohrField = z.infer<typeof BamboohrField>;

export const BamboohrEmployee = z.object({
  id: z.string(),
  employeeNumber: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  addressLineOne: z.string().optional(),
  email: z.string().optional(),
  jobInformationJobTitle: z.string().optional(),
  hireDate: z.string().optional(),
  supervisorId: z.string().optional(),
  supervisorName: z.string().optional(),
  createdByUserId: z.string().optional(),
  jobInformationDepartment: z.string().optional(),
  jobInformationDivision: z.string().optional(),
  employmentStatus: z.string().optional(),
  gender: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  jobInformationLocation: z.string().optional(),
  state: z.string().optional(),
  maritalStatus: z.string().optional(),
  payBand: z.string().optional(),
  compensationPayType: z.string().optional(),
  compensationPaySchedule: z.string().optional(),
  workPhone: z.string().optional(),
  homePhone: z.string().optional()
});

export type BamboohrEmployee = z.infer<typeof BamboohrEmployee>;

export const BamboohrCreateEmployee = z.object({
  firstName: z.string(),
  lastName: z.string(),
  employeeNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address1: z.string().optional(),
  bestEmail: z.string().optional(),
  workEmail: z.string().optional(),
  jobTitle: z.string().optional(),
  hireDate: z.string().optional(),
  supervisorId: z.string().optional(),
  supervisor: z.string().optional(),
  createdByUserId: z.string().optional(),
  department: z.string().optional(),
  division: z.string().optional(),
  employmentHistoryStatus: z.string().optional(),
  gender: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  location: z.string().optional(),
  state: z.string().optional(),
  maritalStatus: z.string().optional(),
  exempt: z.string().optional(),
  payRate: z.string().optional(),
  payType: z.string().optional(),
  payPer: z.string().optional(),
  ssn: z.string().optional(),
  workPhone: z.string().optional(),
  homePhone: z.string().optional()
});

export type BamboohrCreateEmployee = z.infer<typeof BamboohrCreateEmployee>;

export const BamboohrUpdateEmployee = z.object({
  id: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  employeeNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address1: z.string().optional(),
  bestEmail: z.string().optional(),
  workEmail: z.string().optional(),
  jobTitle: z.string().optional(),
  hireDate: z.string().optional(),
  supervisorId: z.string().optional(),
  supervisor: z.string().optional(),
  createdByUserId: z.string().optional(),
  department: z.string().optional(),
  division: z.string().optional(),
  employmentHistoryStatus: z.string().optional(),
  gender: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  location: z.string().optional(),
  state: z.string().optional(),
  maritalStatus: z.string().optional(),
  exempt: z.string().optional(),
  payRate: z.string().optional(),
  payType: z.string().optional(),
  payPer: z.string().optional(),
  ssn: z.string().optional(),
  workPhone: z.string().optional(),
  homePhone: z.string().optional()
});

export type BamboohrUpdateEmployee = z.infer<typeof BamboohrUpdateEmployee>;

export const BamboohrResponseStatus = z.object({
  status: z.string()
});

export type BamboohrResponseStatus = z.infer<typeof BamboohrResponseStatus>;

export const BamboohrCreateEmployeeResponse = z.object({
  status: z.string(),
  id: z.string()
});

export type BamboohrCreateEmployeeResponse = z.infer<typeof BamboohrCreateEmployeeResponse>;

export const StandardEmployeeEmail = z.object({
  email: z.string(),
  type: z.string()
});

export type StandardEmployeeEmail = z.infer<typeof StandardEmployeeEmail>;

export const StandardEmployeeWorkingHours = z.object({
  days: z.array(z.string()),
  hours: z.array(z.string()),
  time_zone: z.string()
});

export type StandardEmployeeWorkingHours = z.infer<typeof StandardEmployeeWorkingHours>;

export const StandardEmployeeAddress = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  type: z.string()
});

export type StandardEmployeeAddress = z.infer<typeof StandardEmployeeAddress>;

export const StandardEmployeeLocation = z.object({
  name: z.string().optional(),
  type: z.string(),
  address: StandardEmployeeAddress
});

export type StandardEmployeeLocation = z.infer<typeof StandardEmployeeLocation>;

export const StandardEmployeePhone = z.object({
  type: z.union([z.literal("WORK"), z.literal("HOME"), z.literal("MOBILE")]),
  number: z.string()
});

export type StandardEmployeePhone = z.infer<typeof StandardEmployeePhone>;

export const StandardEmployeeBankAccount = z.object({
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  routing_number: z.string().optional(),
  type: z.string().optional(),
  currency: z.string().optional()
});

export type StandardEmployeeBankAccount = z.infer<typeof StandardEmployeeBankAccount>;

export const StandardEmployeeManager = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().optional()
});

export type StandardEmployeeManager = z.infer<typeof StandardEmployeeManager>;

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

  addresses: z.array(Address),
  phones: z.array(Phone),
  emails: z.array(Email),
  providerSpecific: z.object({}).catchall(z.any()),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type StandardEmployee = z.infer<typeof StandardEmployee>;

// Dataset-related schemas
export const DatasetField = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  alias: z.string().optional()
});

export type DatasetField = z.infer<typeof DatasetField>;

export const DatasetFieldOptionsResponse = z.object({
  options: z.array(Option)
});

export type DatasetFieldOptionsResponse = z.infer<typeof DatasetFieldOptionsResponse>;

export const DatasetDataResponse = z.object({
  data: z.array(z.record(z.string(), z.any()))
});

export type DatasetDataResponse = z.infer<typeof DatasetDataResponse>;

export const Dataset = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string().optional()
});

export type Dataset = z.infer<typeof Dataset>;

export const DatasetsResponse = z.object({
  datasets: z.array(Dataset)
});

export type DatasetsResponse = z.infer<typeof DatasetsResponse>;

export const Anonymous_bamboohrbasic_action_fetchfields_output = z.array(BamboohrField);
export type Anonymous_bamboohrbasic_action_fetchfields_output = z.infer<typeof Anonymous_bamboohrbasic_action_fetchfields_output>;

export const Anonymous_bamboohrbasic_action_fetchdatasets_output = DatasetsResponse;
export type Anonymous_bamboohrbasic_action_fetchdatasets_output = z.infer<typeof Anonymous_bamboohrbasic_action_fetchdatasets_output>;

export const models = {
  Option: Option,
  BamboohrField: BamboohrField,
  BamboohrEmployee: BamboohrEmployee,
  BamboohrCreateEmployee: BamboohrCreateEmployee,
  BamboohrUpdateEmployee: BamboohrUpdateEmployee,
  BamboohrResponseStatus: BamboohrResponseStatus,
  BamboohrCreateEmployeeResponse: BamboohrCreateEmployeeResponse,
  StandardEmployeeEmail: StandardEmployeeEmail,
  StandardEmployeeWorkingHours: StandardEmployeeWorkingHours,
  StandardEmployeeAddress: StandardEmployeeAddress,
  StandardEmployeeLocation: StandardEmployeeLocation,
  StandardEmployeePhone: StandardEmployeePhone,
  StandardEmployeeBankAccount: StandardEmployeeBankAccount,
  StandardEmployeeManager: StandardEmployeeManager,
  Address: Address,
  Phone: Phone,
  Email: Email,
  StandardEmployee: StandardEmployee,
  DatasetField: DatasetField,
  DatasetFieldOptionsResponse: DatasetFieldOptionsResponse,
  DatasetDataResponse: DatasetDataResponse,
  Dataset: Dataset,
  DatasetsResponse: DatasetsResponse,
  Anonymous_bamboohrbasic_action_fetchfields_output: Anonymous_bamboohrbasic_action_fetchfields_output,
  Anonymous_bamboohrbasic_action_fetchdatasets_output: Anonymous_bamboohrbasic_action_fetchdatasets_output
};
