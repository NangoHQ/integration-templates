import { z } from "zod";

export const IdEntity = z.object({
  id: z.string()
});

export type IdEntity = z.infer<typeof IdEntity>;

export const ActionResponse = z.object({
  id: z.string(),
  success: z.boolean(),
  errors: z.any().array()
});

export type ActionResponse = z.infer<typeof ActionResponse>;

export const SuccessResponse = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponse>;

export const Contact = z.object({
  id: z.string(),
  first_name: z.union([z.string(), z.null()]),
  last_name: z.string(),
  account_name: z.union([z.string(), z.null()]),
  account_id: z.union([z.string(), z.null()]),
  email: z.union([z.string(), z.null()]),
  owner_id: z.string(),
  owner_name: z.string(),
  mobile: z.union([z.string(), z.null()]),
  phone: z.union([z.string(), z.null()]),
  salutation: z.union([z.string(), z.null()]),
  title: z.union([z.string(), z.null()]),
  last_modified_date: z.string()
});

export type Contact = z.infer<typeof Contact>;

export const UserInformation = z.object({
  id: z.string(),
  email: z.string()
});

export type UserInformation = z.infer<typeof UserInformation>;

export const CommonContactInput = z.object({
  first_name: z.string().optional(),
  account_id: z.string().optional(),
  owner_id: z.string().optional(),
  email: z.string().optional(),
  mobile: z.string().optional(),
  phone: z.string().optional(),
  salutation: z.string().optional(),
  title: z.string().optional()
});

export type CommonContactInput = z.infer<typeof CommonContactInput>;

export const CreateContactInput = z.object({
  first_name: z.string().optional(),
  account_id: z.string().optional(),
  owner_id: z.string().optional(),
  email: z.string().optional(),
  mobile: z.string().optional(),
  phone: z.string().optional(),
  salutation: z.string().optional(),
  title: z.string().optional(),
  last_name: z.string()
});

export type CreateContactInput = z.infer<typeof CreateContactInput>;

export const UpdateContactInput = z.object({
  first_name: z.string().optional(),
  account_id: z.string().optional(),
  owner_id: z.string().optional(),
  email: z.string().optional(),
  mobile: z.string().optional(),
  phone: z.string().optional(),
  salutation: z.string().optional(),
  title: z.string().optional(),
  id: z.string(),
  last_name: z.string().optional()
});

export type UpdateContactInput = z.infer<typeof UpdateContactInput>;

export const Lead = z.object({
  id: z.string(),
  first_name: z.union([z.string(), z.null()]),
  last_name: z.string(),
  company_name: z.string(),
  email: z.union([z.string(), z.null()]),
  owner_id: z.string(),
  owner_name: z.string(),
  phone: z.union([z.string(), z.null()]),
  salutation: z.union([z.string(), z.null()]),
  title: z.union([z.string(), z.null()]),
  website: z.union([z.string(), z.null()]),
  industry: z.union([z.string(), z.null()]),
  last_modified_date: z.string()
});

export type Lead = z.infer<typeof Lead>;

export const CommonLeadInput = z.object({
  first_name: z.string().optional(),
  email: z.string().optional(),
  owner_id: z.string().optional(),
  phone: z.string().optional(),
  salutation: z.string().optional(),
  title: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional()
});

export type CommonLeadInput = z.infer<typeof CommonLeadInput>;

export const CreateLeadInput = z.object({
  first_name: z.string().optional(),
  email: z.string().optional(),
  owner_id: z.string().optional(),
  phone: z.string().optional(),
  salutation: z.string().optional(),
  title: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  last_name: z.string(),
  company_name: z.string()
});

export type CreateLeadInput = z.infer<typeof CreateLeadInput>;

export const UpdateLeadInput = z.object({
  first_name: z.string().optional(),
  email: z.string().optional(),
  owner_id: z.string().optional(),
  phone: z.string().optional(),
  salutation: z.string().optional(),
  title: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  id: z.string(),
  last_name: z.string().optional(),
  company_name: z.string().optional()
});

export type UpdateLeadInput = z.infer<typeof UpdateLeadInput>;

export const Account = z.object({
  id: z.string(),
  name: z.string(),
  description: z.union([z.string(), z.null()]),
  website: z.union([z.string(), z.null()]),
  industry: z.union([z.string(), z.null()]),
  billing_city: z.union([z.string(), z.null()]),
  billing_country: z.union([z.string(), z.null()]),
  owner_id: z.string(),
  owner_name: z.string(),
  last_modified_date: z.string()
});

export type Account = z.infer<typeof Account>;

export const CommonAccountInput = z.object({
  description: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  billing_city: z.string().optional(),
  billing_country: z.string().optional(),
  owner_id: z.string().optional()
});

export type CommonAccountInput = z.infer<typeof CommonAccountInput>;

export const CreateAccountInput = z.object({
  description: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  billing_city: z.string().optional(),
  billing_country: z.string().optional(),
  owner_id: z.string().optional(),
  name: z.string()
});

export type CreateAccountInput = z.infer<typeof CreateAccountInput>;

export const UpdateAccountInput = z.object({
  description: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  billing_city: z.string().optional(),
  billing_country: z.string().optional(),
  owner_id: z.string().optional(),
  id: z.string(),
  name: z.string().optional()
});

export type UpdateAccountInput = z.infer<typeof UpdateAccountInput>;

export const Opportunity = z.object({
  id: z.string(),
  opportunity_name: z.string(),
  account_name: z.union([z.string(), z.null()]),
  account_id: z.union([z.string(), z.null()]),
  amount: z.union([z.number(), z.null()]),
  description: z.union([z.string(), z.null()]),
  close_date: z.string(),
  created_by_id: z.string(),
  created_by: z.string(),
  owner_id: z.string(),
  owner_name: z.string(),
  stage: z.string(),
  probability: z.union([z.number(), z.null()]),
  type: z.union([z.string(), z.null()]),
  last_modified_date: z.string()
});

export type Opportunity = z.infer<typeof Opportunity>;

export const CommonOpportunityInput = z.object({
  account_id: z.string().optional(),
  amount: z.number().optional(),
  description: z.string().optional(),
  created_by_id: z.string().optional(),
  owner_id: z.string().optional(),
  probability: z.number().optional(),
  type: z.string().optional()
});

export type CommonOpportunityInput = z.infer<typeof CommonOpportunityInput>;

export const CreateOpportunityInput = z.object({
  account_id: z.string().optional(),
  amount: z.number().optional(),
  description: z.string().optional(),
  created_by_id: z.string().optional(),
  owner_id: z.string().optional(),
  probability: z.number().optional(),
  type: z.string().optional(),
  opportunity_name: z.string(),
  close_date: z.string(),
  stage: z.string()
});

export type CreateOpportunityInput = z.infer<typeof CreateOpportunityInput>;

export const UpdateOpportunityInput = z.object({
  account_id: z.string().optional(),
  amount: z.number().optional(),
  description: z.string().optional(),
  created_by_id: z.string().optional(),
  owner_id: z.string().optional(),
  probability: z.number().optional(),
  type: z.string().optional(),
  id: z.string(),
  opportunity_name: z.string().optional(),
  close_date: z.string().optional(),
  stage: z.string().optional()
});

export type UpdateOpportunityInput = z.infer<typeof UpdateOpportunityInput>;

export const Deal = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.union([z.number(), z.null()]),
  stage: z.string(),
  account_id: z.string(),
  last_modified_date: z.string()
});

export type Deal = z.infer<typeof Deal>;

export const Article = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  last_modified_date: z.string()
});

export type Article = z.infer<typeof Article>;

export const Conversation = z.object({
  id: z.string(),
  body: z.string(),
  created_date: z.string(),
  created_by: z.string()
});

export type Conversation = z.infer<typeof Conversation>;

export const Ticket = z.object({
  id: z.string(),
  case_number: z.string(),
  subject: z.union([z.string(), z.null()]),
  account_id: z.union([z.string(), z.null()]),
  account_name: z.union([z.string(), z.null()]),
  contact_id: z.union([z.string(), z.null()]),
  contact_name: z.union([z.string(), z.null()]),
  owner_id: z.string(),
  owner_name: z.union([z.string(), z.null()]),
  priority: z.string(),
  status: z.string(),
  description: z.union([z.string(), z.null()]),
  type: z.union([z.string(), z.null()]),
  created_date: z.string(),
  closed_date: z.union([z.string(), z.null()]),
  origin: z.union([z.string(), z.null()]),
  is_closed: z.boolean(),
  is_escalated: z.boolean(),
  conversation: Conversation.array(),
  last_modified_date: z.string()
});

export type Ticket = z.infer<typeof Ticket>;

export const SalesforceEntity = z.object({
  name: z.string()
});

export type SalesforceEntity = z.infer<typeof SalesforceEntity>;

export const Field = z.object({
  name: z.string(),
  label: z.string(),
  type: z.string(),
  referenceTo: z.string().array(),
  relationshipName: z.union([z.string(), z.null()])
});

export type Field = z.infer<typeof Field>;

export const NestedFieldSchema = z.object({
  fields: Field.array()
});

export type NestedFieldSchema = z.infer<typeof NestedFieldSchema>;

export const ChildField = z.object({
  object: z.string(),
  relationshipName: z.union([z.string(), z.null()]),
  field: z.string()
});

export type ChildField = z.infer<typeof ChildField>;

export const ValidationRule = z.object({
  id: z.string(),
  name: z.string(),
  errorConditionFormula: z.string(),
  errorMessage: z.string()
});

export type ValidationRule = z.infer<typeof ValidationRule>;

export const SalesforceFieldSchema = z.object({
  fields: Field.array(),
  childRelationships: ChildField.array(),
  validationRules: ValidationRule.array()
});

export type SalesforceFieldSchema = z.infer<typeof SalesforceFieldSchema>;

export const ActionResponseErrorDetails = z.object({
  message: z.string(),
  method: z.string(),
  url: z.string(),
  code: z.string()
});

export type ActionResponseErrorDetails = z.infer<typeof ActionResponseErrorDetails>;

export const ActionResponseError = z.object({
  message: z.string(),
  details: ActionResponseErrorDetails
});

export type ActionResponseError = z.infer<typeof ActionResponseError>;

export const SalesforceMetadata = z.object({
  customFields: z.string().array()
});

export type SalesforceMetadata = z.infer<typeof SalesforceMetadata>;

export const models = {
  IdEntity: IdEntity,
  ActionResponse: ActionResponse,
  SuccessResponse: SuccessResponse,
  Contact: Contact,
  UserInformation: UserInformation,
  CommonContactInput: CommonContactInput,
  CreateContactInput: CreateContactInput,
  UpdateContactInput: UpdateContactInput,
  Lead: Lead,
  CommonLeadInput: CommonLeadInput,
  CreateLeadInput: CreateLeadInput,
  UpdateLeadInput: UpdateLeadInput,
  Account: Account,
  CommonAccountInput: CommonAccountInput,
  CreateAccountInput: CreateAccountInput,
  UpdateAccountInput: UpdateAccountInput,
  Opportunity: Opportunity,
  CommonOpportunityInput: CommonOpportunityInput,
  CreateOpportunityInput: CreateOpportunityInput,
  UpdateOpportunityInput: UpdateOpportunityInput,
  Deal: Deal,
  Article: Article,
  Conversation: Conversation,
  Ticket: Ticket,
  SalesforceEntity: SalesforceEntity,
  Field: Field,
  NestedFieldSchema: NestedFieldSchema,
  ChildField: ChildField,
  ValidationRule: ValidationRule,
  SalesforceFieldSchema: SalesforceFieldSchema,
  ActionResponseErrorDetails: ActionResponseErrorDetails,
  ActionResponseError: ActionResponseError,
  SalesforceMetadata: SalesforceMetadata
};