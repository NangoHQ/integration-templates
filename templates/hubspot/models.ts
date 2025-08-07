import { z } from "zod";

export const IdEntity = z.object({
  id: z.string()
});

export type IdEntity = z.infer<typeof IdEntity>;

export const SuccessResponse = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponse>;

export const Id = z.object({
  id: z.string()
});

export type Id = z.infer<typeof Id>;

export const Timestamps = z.object({
  updatedAt: z.string(),
  createdAt: z.string()
});

export type Timestamps = z.infer<typeof Timestamps>;

export const OptionalObjectType = z.object({
  objectType: z.string().optional()
});

export type OptionalObjectType = z.infer<typeof OptionalObjectType>;

export const InputProperty = z.object({
  name: z.string()
});

export type InputProperty = z.infer<typeof InputProperty>;

export const Option = z.object({
  label: z.string(),
  value: z.string(),
  displayOrder: z.number(),
  hidden: z.boolean()
});

export type Option = z.infer<typeof Option>;

export const Property = z.object({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  name: z.string(),
  label: z.string(),
  type: z.string(),
  fieldType: z.string(),
  description: z.string(),
  groupName: z.string(),
  options: z.any().optional().array(),
  displayOrder: z.number(),
  calculated: z.boolean(),
  externalOptions: z.boolean(),
  hasUniqueValue: z.boolean(),
  hidden: z.boolean(),
  hubspotDefined: z.boolean().optional(),
  showCurrencySymbol: z.boolean().optional(),

  modificationMetadata: z.object({
    archivable: z.boolean().optional(),
    readOnlyDefinition: z.boolean().optional(),
    readOnlyValue: z.boolean().optional(),
    readOnlyOptions: z.boolean().optional()
  }).optional(),

  formField: z.boolean(),
  dataSensitivity: z.string()
}).catchall(z.any());

export type Property = z.infer<typeof Property>;

export const PropertyResponse = z.object({
  results: Property.array()
});

export type PropertyResponse = z.infer<typeof PropertyResponse>;

export const CustomPropertyOption = z.object({
  hidden: z.boolean(),
  displayOrder: z.number().optional(),
  description: z.string().optional(),
  label: z.string(),
  value: z.string()
});

export type CustomPropertyOption = z.infer<typeof CustomPropertyOption>;

export const CustomProperty = z.object({
  hidden: z.boolean().optional(),
  displayOrder: z.number().optional(),
  description: z.string().optional(),
  label: z.string(),
  type: z.string(),
  formField: z.boolean().optional(),
  groupName: z.string(),
  referencedObjectType: z.string().optional(),
  name: z.string(),
  options: CustomPropertyOption.array(),
  calculationFormula: z.string().optional(),
  hasUniqueValue: z.boolean().optional(),
  fieldType: z.string(),
  externalOptions: z.boolean().optional()
});

export type CustomProperty = z.infer<typeof CustomProperty>;

export const CreatePropertyInput = z.object({
  objectType: z.string(),
  data: CustomProperty
});

export type CreatePropertyInput = z.infer<typeof CreatePropertyInput>;

export const CreatedProperty = z.object({
  createdUserId: z.string(),
  hidden: z.boolean(),

  modificationMetadata: z.object({
    readOnlyOptions: z.boolean().optional(),
    readOnlyValue: z.boolean(),
    readOnlyDefinition: z.boolean(),
    archivable: z.boolean()
  }),

  displayOrder: z.number(),
  description: z.string(),
  showCurrencySymbol: z.boolean().optional(),
  label: z.string(),
  type: z.string(),
  hubspotDefined: z.boolean().optional(),
  formField: z.boolean(),
  dataSensitivity: z.string().optional(),
  createdAt: z.string(),
  archivedAt: z.string().optional(),
  archived: z.boolean(),
  groupName: z.string(),
  referencedObjectType: z.string().optional(),
  name: z.string(),

  options: z.array(z.object({
    hidden: z.boolean(),
    displayOrder: z.number(),
    description: z.string(),
    label: z.string(),
    value: z.string()
  })),

  calculationFormula: z.string().optional(),
  hasUniqueValue: z.boolean(),
  fieldType: z.string(),
  updatedUserId: z.string(),
  calculated: z.boolean(),
  externalOptions: z.boolean(),
  updatedAt: z.string()
});

export type CreatedProperty = z.infer<typeof CreatedProperty>;

export const Role = z.object({
  requiresBillingWrite: z.boolean(),
  name: z.string(),
  id: z.string()
});

export type Role = z.infer<typeof Role>;

export const RoleResponse = z.object({
  results: Role.array()
});

export type RoleResponse = z.infer<typeof RoleResponse>;

export const UserRoleInput = z.object({
  id: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  primaryTeamId: z.string().optional()
});

export type UserRoleInput = z.infer<typeof UserRoleInput>;

export const CreatedUser = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  primaryTeamId: z.string().optional(),
  email: z.string(),
  sendWelcomeEmail: z.boolean(),
  roleIds: z.string().array(),
  secondaryTeamIds: z.string().array(),
  superAdmin: z.boolean()
});

export type CreatedUser = z.infer<typeof CreatedUser>;

export const ChangedRoleResponse = z.object({
  id: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  primaryTeamId: z.string().optional(),
  email: z.string(),
  sendWelcomeEmail: z.boolean().optional(),
  roleIds: z.string().array(),
  secondaryTeamIds: z.string().optional().array(),
  superAdmin: z.boolean()
});

export type ChangedRoleResponse = z.infer<typeof ChangedRoleResponse>;

export const HubspotServiceTicket = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  isArchived: z.boolean(),
  subject: z.string(),
  content: z.string(),
  objectId: z.number(),
  ownerId: z.number(),
  pipeline: z.number(),
  pipelineStage: z.number(),
  ticketCategory: z.union([z.string(), z.null()]),
  ticketPriority: z.string()
});

export type HubspotServiceTicket = z.infer<typeof HubspotServiceTicket>;

export const HubspotOwner = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  userId: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  archived: z.boolean()
});

export type HubspotOwner = z.infer<typeof HubspotOwner>;

export const User = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  roleIds: z.string().array(),
  primaryTeamId: z.string().optional(),
  superAdmin: z.boolean()
});

export type User = z.infer<typeof User>;

export const CreateUser = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  primaryTeamId: z.string().optional(),
  email: z.string(),
  sendWelcomeEmail: z.boolean().optional(),
  roleId: z.string().optional(),
  secondaryTeamIds: z.string().optional().array()
});

export type CreateUser = z.infer<typeof CreateUser>;

export const UserInformation = z.object({
  id: z.number(),
  email: z.string()
});

export type UserInformation = z.infer<typeof UserInformation>;

export const HubspotKnowledgeBase = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  content: z.string(),
  publishDate: z.number()
});

export type HubspotKnowledgeBase = z.infer<typeof HubspotKnowledgeBase>;

export const CreateContactInput = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().optional(),
  job_title: z.string().optional(),
  lead_status: z.string().optional(),
  lifecycle_stage: z.string().optional(),
  salutation: z.string().optional(),
  mobile_phone_number: z.string().optional(),
  website_url: z.string().optional(),
  owner: z.string().optional()
});

export type CreateContactInput = z.infer<typeof CreateContactInput>;

export const CreateUpdateContactOutput = z.object({
  id: z.string(),
  created_date: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().optional(),
  job_title: z.string().optional(),
  last_contacted: z.string().optional(),
  last_activity_date: z.string().optional(),
  lead_status: z.string().optional(),
  lifecycle_stage: z.string().optional(),
  salutation: z.string().optional(),
  mobile_phone_number: z.string().optional(),
  website_url: z.string().optional(),
  owner: z.string().optional()
});

export type CreateUpdateContactOutput = z.infer<typeof CreateUpdateContactOutput>;

export const UpdateContactInput = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().optional(),
  job_title: z.string().optional(),
  lead_status: z.string().optional(),
  lifecycle_stage: z.string().optional(),
  salutation: z.string().optional(),
  mobile_phone_number: z.string().optional(),
  website_url: z.string().optional(),
  owner: z.string().optional(),
  id: z.string()
});

export type UpdateContactInput = z.infer<typeof UpdateContactInput>;

export const Contact = z.object({
  id: z.string(),
  created_date: z.string(),
  first_name: z.union([z.string(), z.null()]),
  last_name: z.union([z.string(), z.null()]),
  email: z.union([z.string(), z.null()]),
  job_title: z.union([z.string(), z.null()]),
  last_contacted: z.union([z.string(), z.null()]),
  last_activity_date: z.union([z.string(), z.null()]),
  lead_status: z.union([z.string(), z.null()]),
  lifecycle_stage: z.union([z.string(), z.null()]),
  salutation: z.union([z.string(), z.null()]),
  mobile_phone_number: z.union([z.string(), z.null()]),
  website_url: z.union([z.string(), z.null()]),
  owner: z.union([z.string(), z.null()])
});

export type Contact = z.infer<typeof Contact>;

export const CurrencyCode = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string()
});

export type CurrencyCode = z.infer<typeof CurrencyCode>;

export const CreateCompanyInput = z.object({
  name: z.string().optional(),
  industry: z.string().optional(),
  description: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  lead_status: z.string().optional(),
  lifecycle_stage: z.string().optional(),
  owner: z.string().optional(),
  year_founded: z.string().optional(),
  website_url: z.string().optional()
});

export type CreateCompanyInput = z.infer<typeof CreateCompanyInput>;

export const UpdateCompanyInput = z.object({
  id: z.string(),
  name: z.string().optional(),
  industry: z.string().optional(),
  description: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  lead_status: z.string().optional(),
  lifecycle_stage: z.string().optional(),
  owner: z.string().optional(),
  year_founded: z.string().optional(),
  website_url: z.string().optional()
});

export type UpdateCompanyInput = z.infer<typeof UpdateCompanyInput>;

export const CreateUpdateCompanyOutput = z.object({
  id: z.string(),
  created_date: z.string(),
  name: z.string().optional(),
  industry: z.string().optional(),
  description: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  lead_status: z.string().optional(),
  lifecycle_stage: z.string().optional(),
  owner: z.string().optional(),
  year_founded: z.string().optional(),
  website_url: z.string().optional()
});

export type CreateUpdateCompanyOutput = z.infer<typeof CreateUpdateCompanyOutput>;

export const Company = z.object({
  id: z.string(),
  created_date: z.union([z.string(), z.null()]),
  name: z.union([z.string(), z.null()]),
  industry: z.union([z.string(), z.null()]),
  description: z.union([z.string(), z.null()]),
  country: z.union([z.string(), z.null()]),
  city: z.union([z.string(), z.null()]),
  lead_status: z.union([z.string(), z.null()]),
  lifecycle_stage: z.union([z.string(), z.null()]),
  owner: z.union([z.string(), z.null()]),
  year_founded: z.union([z.string(), z.null()]),
  website_url: z.union([z.string(), z.null()])
});

export type Company = z.infer<typeof Company>;

export const Account = z.object({
  id: z.string(),
  type: z.string(),
  timeZone: z.string(),
  companyCurrency: z.string(),
  additionalCurrencies: z.string().array(),
  utcOffset: z.string(),
  utcOffsetMilliseconds: z.number(),
  uiDomain: z.string(),
  dataHostingLocation: z.string()
});

export type Account = z.infer<typeof Account>;

export const AssociationTypes = z.object({
  association_category: z.string(),
  association_type_Id: z.number()
});

export type AssociationTypes = z.infer<typeof AssociationTypes>;

export const Association = z.object({
  to: z.number(),
  types: AssociationTypes.array()
});

export type Association = z.infer<typeof Association>;

export const CreateTaskInput = z.object({
  task_type: z.string().optional(),
  title: z.string().optional(),
  priority: z.string().optional(),
  assigned_to: z.string().optional(),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  associations: Association.array().optional()
});

export type CreateTaskInput = z.infer<typeof CreateTaskInput>;

export const UpdateTaskInput = z.object({
  id: z.string(),
  task_type: z.string().optional(),
  title: z.string().optional(),
  priority: z.string().optional(),
  assigned_to: z.string().optional(),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  associations: Association.array().optional()
});

export type UpdateTaskInput = z.infer<typeof UpdateTaskInput>;

export const CreateUpdateTaskOutput = z.object({
  id: z.string(),
  task_type: z.string().optional(),
  title: z.string().optional(),
  priority: z.string().optional(),
  assigned_to: z.string().optional(),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  associations: Association.array().optional()
});

export type CreateUpdateTaskOutput = z.infer<typeof CreateUpdateTaskOutput>;

export const AssociationCompany = z.object({
  id: z.string(),
  name: z.union([z.string(), z.null()])
});

export type AssociationCompany = z.infer<typeof AssociationCompany>;

export const AssociationContact = z.object({
  id: z.string(),
  first_name: z.union([z.string(), z.null()]),
  last_name: z.union([z.string(), z.null()])
});

export type AssociationContact = z.infer<typeof AssociationContact>;

export const AssociationDeal = z.object({
  id: z.string(),
  name: z.union([z.string(), z.null()])
});

export type AssociationDeal = z.infer<typeof AssociationDeal>;

export const ReturnedAssociations = z.object({
  companies: AssociationCompany.array().optional(),
  contacts: AssociationContact.array().optional(),
  deals: AssociationDeal.array().optional()
});

export type ReturnedAssociations = z.infer<typeof ReturnedAssociations>;

export const Task = z.object({
  id: z.string(),
  task_type: z.union([z.string(), z.null()]),
  title: z.union([z.string(), z.null()]),
  priority: z.union([z.string(), z.null()]),
  assigned_to: z.union([z.string(), z.null()]),
  due_date: z.union([z.string(), z.null()]),
  notes: z.union([z.string(), z.null()]),
  returned_associations: ReturnedAssociations.optional()
});

export type Task = z.infer<typeof Task>;

export const CreateDealInput = z.object({
  name: z.string().optional(),
  amount: z.string().optional(),
  close_date: z.string().optional(),
  deal_description: z.string().optional(),
  owner: z.string().optional(),
  deal_stage: z.string().optional(),
  deal_probability: z.string().optional(),
  associations: Association.array().optional()
});

export type CreateDealInput = z.infer<typeof CreateDealInput>;

export const UpdateDealInput = z.object({
  id: z.string(),
  name: z.string().optional(),
  amount: z.string().optional(),
  close_date: z.string().optional(),
  deal_description: z.string().optional(),
  owner: z.string().optional(),
  deal_stage: z.string().optional(),
  deal_probability: z.string().optional(),
  associations: Association.array().optional()
});

export type UpdateDealInput = z.infer<typeof UpdateDealInput>;

export const CreateUpdateDealOutput = z.object({
  id: z.string(),
  name: z.string().optional(),
  amount: z.string().optional(),
  close_date: z.string().optional(),
  deal_description: z.string().optional(),
  owner: z.string().optional(),
  deal_stage: z.string().optional(),
  deal_probability: z.string().optional()
});

export type CreateUpdateDealOutput = z.infer<typeof CreateUpdateDealOutput>;

export const Deal = z.object({
  id: z.string(),
  name: z.union([z.string(), z.null()]),
  amount: z.union([z.string(), z.null()]),
  close_date: z.union([z.string(), z.null()]),
  deal_description: z.union([z.string(), z.null()]),
  owner: z.union([z.string(), z.null()]),
  deal_stage: z.union([z.string(), z.null()]),
  deal_probability: z.union([z.string(), z.null()]),
  returned_associations: ReturnedAssociations.optional()
});

export type Deal = z.infer<typeof Deal>;

export const Note = z.object({
  id: z.string().optional(),
  time_stamp: z.string(),
  created_date: z.string().optional(),
  body: z.string().optional(),
  attachment_ids: z.string().optional(),
  owner: z.string().optional(),
  associations: Association.array().optional()
});

export type Note = z.infer<typeof Note>;

export const LineItemDefaultProperties = z.object({
  name: z.string(),
  price: z.string(),
  quantity: z.string(),
  recurringbillingfrequency: z.union([z.null(), z.number()]),
  tax: z.union([z.null(), z.number()]),
  amount: z.string(),
  createdate: z.string(),
  description: z.string(),
  discount: z.union([z.null(), z.number()])
});

export type LineItemDefaultProperties = z.infer<typeof LineItemDefaultProperties>;

export const LineItem = z.object({
  name: z.string(),
  price: z.string(),
  quantity: z.string(),
  recurringbillingfrequency: z.union([z.null(), z.number()]),
  tax: z.union([z.null(), z.number()]),
  amount: z.string(),
  createdate: z.string(),
  description: z.string(),
  discount: z.union([z.null(), z.number()]),
  id: z.string()
}).catchall(z.any());

export type LineItem = z.infer<typeof LineItem>;

export const CustomObject = z.object({
  id: z.string()
}).catchall(z.any());

export type CustomObject = z.infer<typeof CustomObject>;

export const Product = z.object({
  updatedAt: z.string(),
  createdAt: z.string(),
  id: z.string(),
  amount: z.union([z.number(), z.null()]),
  description: z.union([z.string(), z.null()]),
  discount: z.union([z.number(), z.null()]),
  sku: z.union([z.string(), z.null()]),
  url: z.union([z.string(), z.null()]),
  name: z.string(),
  price: z.string(),
  quantity: z.union([z.number(), z.null()]),
  recurringBillingFrequency: z.union([z.number(), z.null()]),
  tax: z.union([z.null(), z.number()])
});

export type Product = z.infer<typeof Product>;

export const Stage = z.object({
  updatedAt: z.string(),
  createdAt: z.string(),
  label: z.string(),
  displayOrder: z.number(),

  metadata: z.object({
    isClosed: z.boolean(),
    probability: z.string()
  }),

  id: z.string(),
  archived: z.boolean(),
  writePermissions: z.string()
});

export type Stage = z.infer<typeof Stage>;

export const Pipeline = z.object({
  updatedAt: z.string(),
  createdAt: z.string(),
  label: z.string(),
  displayOrder: z.number(),
  id: z.string(),
  archived: z.boolean(),
  stages: Stage.array()
});

export type Pipeline = z.infer<typeof Pipeline>;

export const PipelineOutput = z.object({
  pipelines: Pipeline.array()
});

export type PipelineOutput = z.infer<typeof PipelineOutput>;

export const models = {
  IdEntity: IdEntity,
  SuccessResponse: SuccessResponse,
  Id: Id,
  Timestamps: Timestamps,
  OptionalObjectType: OptionalObjectType,
  InputProperty: InputProperty,
  Option: Option,
  Property: Property,
  PropertyResponse: PropertyResponse,
  CustomPropertyOption: CustomPropertyOption,
  CustomProperty: CustomProperty,
  CreatePropertyInput: CreatePropertyInput,
  CreatedProperty: CreatedProperty,
  Role: Role,
  RoleResponse: RoleResponse,
  UserRoleInput: UserRoleInput,
  CreatedUser: CreatedUser,
  ChangedRoleResponse: ChangedRoleResponse,
  HubspotServiceTicket: HubspotServiceTicket,
  HubspotOwner: HubspotOwner,
  User: User,
  CreateUser: CreateUser,
  UserInformation: UserInformation,
  HubspotKnowledgeBase: HubspotKnowledgeBase,
  CreateContactInput: CreateContactInput,
  CreateUpdateContactOutput: CreateUpdateContactOutput,
  UpdateContactInput: UpdateContactInput,
  Contact: Contact,
  CurrencyCode: CurrencyCode,
  CreateCompanyInput: CreateCompanyInput,
  UpdateCompanyInput: UpdateCompanyInput,
  CreateUpdateCompanyOutput: CreateUpdateCompanyOutput,
  Company: Company,
  Account: Account,
  AssociationTypes: AssociationTypes,
  Association: Association,
  CreateTaskInput: CreateTaskInput,
  UpdateTaskInput: UpdateTaskInput,
  CreateUpdateTaskOutput: CreateUpdateTaskOutput,
  AssociationCompany: AssociationCompany,
  AssociationContact: AssociationContact,
  AssociationDeal: AssociationDeal,
  ReturnedAssociations: ReturnedAssociations,
  Task: Task,
  CreateDealInput: CreateDealInput,
  UpdateDealInput: UpdateDealInput,
  CreateUpdateDealOutput: CreateUpdateDealOutput,
  Deal: Deal,
  Note: Note,
  LineItemDefaultProperties: LineItemDefaultProperties,
  LineItem: LineItem,
  CustomObject: CustomObject,
  Product: Product,
  Stage: Stage,
  Pipeline: Pipeline,
  PipelineOutput: PipelineOutput
};
