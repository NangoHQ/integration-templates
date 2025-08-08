import { z } from "zod";

export const Timestamps = z.object({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export type Timestamps = z.infer<typeof Timestamps>;

export const Entity = z.object({
  name: z.string()
});

export type Entity = z.infer<typeof Entity>;

export const Location = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zip: z.string().optional()
});

export type Location = z.infer<typeof Location>;

export const Stage = z.object({
  id: z.number(),
  name: z.string(),
  status: z.string()
});

export type Stage = z.infer<typeof Stage>;

export const StageResponse = z.object({
    stages: Stage.array(),
});

export type StageResponse = z.infer<typeof StageResponse>;

export const FederalAgency = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zip: z.string().optional(),
  companyId: z.number().optional(),
  name: z.string(),
  externalId: z.string().optional(),
  acronym: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  address3: z.string().optional(),
  isHeadquarters: z.boolean().optional(),
  parentCompanyId: z.number().optional(),
  parentCompanyName: z.string().optional(),
  childCount: z.number().optional(),
  addrLat: z.number().optional(),
  addrLong: z.number().optional()
});

export type FederalAgency = z.infer<typeof FederalAgency>;

export const CreateCompany = z.object({
  name: z.string(),
  federalAgency: FederalAgency
});

export type CreateCompany = z.infer<typeof CreateCompany>;

export const Company = z.object({
  name: z.string(),
  externalId: z.string(),
  federalAgency: FederalAgency.optional(),
  shortName: z.string(),
  description: z.string(),
  id: z.string().optional()
});

export type Company = z.infer<typeof Company>;

export const Opportunity = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zip: z.string().optional(),
  name: z.string(),
  description: z.string(),
  id: z.string().optional(),
  externalId: z.string(),
  dueDate: z.string(),
  federalAgency: FederalAgency,
  stage: z.string(),
  active: z.boolean()
});

export type Opportunity = z.infer<typeof Opportunity>;

export const Activity = z.object({
  createdAt: z.string(),
  id: z.string(),
  message: z.string()
});

export type Activity = z.infer<typeof Activity>;

export const Contact = z.object({
  id: z.string().optional(),
  firstName: z.string(),
  lastName: z.string(),
  federalAgency: FederalAgency,
  position: z.string(),
  emailAddress: z.string(),
  phone: z.string(),
  fax: z.string()
});

export type Contact = z.infer<typeof Contact>;

export const BaseLead = z.object({
  federalAgency: FederalAgency,
  name: z.string(),
  dueDate: z.string(),
  postedDate: z.string(),
  solicitationNumber: z.string(),
  naicsCategory: z.union([z.string(), z.string().array()]),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  description: z.string()
});

export type BaseLead = z.infer<typeof BaseLead>;

export const CreateLead = z.object({
  federalAgency: FederalAgency,
  name: z.string(),
  dueDate: z.string(),
  postedDate: z.string(),
  solicitationNumber: z.string(),
  naicsCategory: z.union([z.string(), z.string().array()]),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  description: z.string()
});

export type CreateLead = z.infer<typeof CreateLead>;

export const UpdateLead = z.object({
  federalAgency: FederalAgency,
  name: z.string(),
  dueDate: z.string(),
  postedDate: z.string(),
  solicitationNumber: z.string(),
  naicsCategory: z.union([z.string(), z.string().array()]),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  description: z.string(),
  id: z.string()
});

export type UpdateLead = z.infer<typeof UpdateLead>;

export const Lead = z.object({
  federalAgency: FederalAgency,
  name: z.string(),
  dueDate: z.string(),
  postedDate: z.string(),
  solicitationNumber: z.string(),
  naicsCategory: z.union([z.string(), z.string().array()]),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  description: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  id: z.string()
});

export type Lead = z.infer<typeof Lead>;

export const Schema = z.object({
  PropertyName: z.string(),
  Group: z.union([z.string(), z.null()]),
  Label: z.string(),
  Description: z.union([z.string(), z.null()]),
  Enabled: z.boolean(),
  ReadOnly: z.boolean(),
  Required: z.boolean(),
  DefaultValue: z.union([z.string(), z.null()]),
  DataType: z.number(),
  MaxLength: z.union([z.number(), z.null()]),
  UnicodeSupported: z.boolean(),
  Searchable: z.boolean(),
  ArrayType: z.union([z.string(), z.null()]),
  IsPrimaryKey: z.boolean(),
  IsExternalId: z.boolean(),
  ObjectEndpoint: z.union([z.string(), z.null()]),
  IsHidden: z.boolean(),
  IsIncludedInResponse: z.boolean(),
  SchemaEndpoint: z.union([z.string(), z.null()]),
  SortOrder: z.number(),
  CustomSort: z.boolean()
});

export type Schema = z.infer<typeof Schema>;
export const Anonymous_unanet_action_getleads_output = Lead.array();
export type Anonymous_unanet_action_getleads_output = z.infer<typeof Anonymous_unanet_action_getleads_output>;
export const Anonymous_unanet_action_getschema_output = Schema.array();
export type Anonymous_unanet_action_getschema_output = z.infer<typeof Anonymous_unanet_action_getschema_output>;
export const Anonymous_unanet_action_getcompany_output = z.union([Company, z.null()]);
export type Anonymous_unanet_action_getcompany_output = z.infer<typeof Anonymous_unanet_action_getcompany_output>;

export const models = {
  Timestamps: Timestamps,
  Entity: Entity,
  Location: Location,
  Stage: Stage,
  FederalAgency: FederalAgency,
  CreateCompany: CreateCompany,
  Company: Company,
  Opportunity: Opportunity,
  Activity: Activity,
  Contact: Contact,
  BaseLead: BaseLead,
  CreateLead: CreateLead,
  UpdateLead: UpdateLead,
  Lead: Lead,
  Schema: Schema,
  Anonymous_unanet_action_getleads_output: Anonymous_unanet_action_getleads_output,
  Anonymous_unanet_action_getschema_output: Anonymous_unanet_action_getschema_output,
  Anonymous_unanet_action_getcompany_output: Anonymous_unanet_action_getcompany_output
};
