import { z } from "zod";

export const IdEntity = z.object({
  id: z.string()
});

export type IdEntity = z.infer<typeof IdEntity>;

export const SuccessResponse = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponse>;

export const CreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string()
});

export type CreateUser = z.infer<typeof CreateUser>;

export const FreshdeskCreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  ticket_scope: z.number().optional(),

  ticketScope: z.union([
    z.literal("globalAccess"),
    z.literal("groupAccess"),
    z.literal("restrictedAccess")
  ]).optional(),

  occasional: z.boolean().optional(),
  signature: z.string().optional(),
  skill_ids: z.number().optional().array(),
  group_ids: z.number().optional().array(),
  role_ids: z.number().optional().array(),
  agent_type: z.number().optional(),
  agentType: z.union([z.literal("support"), z.literal("field"), z.literal("collaborator")]).optional(),
  language: z.string().optional(),
  time_zone: z.string().optional(),
  focus_mode: z.boolean().optional()
});

export type FreshdeskCreateUser = z.infer<typeof FreshdeskCreateUser>;

export const User = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string()
});

export type User = z.infer<typeof User>;

export const Contact = z.object({
  id: z.string(),
  active: z.boolean(),
  email: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  companyId: z.string().optional(),
  phone: z.union([z.string(), z.null()]).optional(),
  mobile: z.union([z.string(), z.null()]).optional(),
  jobTitle: z.union([z.string(), z.null()]).optional()
});

export type Contact = z.infer<typeof Contact>;

export const CreateContact = z.object({
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),

  twitter_id: z.object({
    type: z.string(),
    unique: z.any(),
    required: z.any()
  }).optional(),

  unique_external_id: z.object({
    type: z.string(),
    unique: z.any(),
    required: z.any()
  }).optional(),

  other_emails: z.any().array().optional(),
  company_id: z.number().optional(),
  view_all_tickets: z.boolean().optional(),
  other_companies: z.any().array().optional(),
  address: z.string().optional(),
  avatar: z.object({}).optional(),
  custom_fields: z.object({}).optional(),
  description: z.string().optional(),
  job_title: z.string().optional(),
  language: z.string().optional(),
  tags: z.any().array().optional(),
  time_zone: z.string().optional(),
  lookup_parameter: z.string().optional()
});

export type CreateContact = z.infer<typeof CreateContact>;

export const Timestamps = z.object({
  created_at: z.string(),
  updated_at: z.string()
});

export type Timestamps = z.infer<typeof Timestamps>;

export const HierarchyData = z.object({
  id: z.number(),
  name: z.string(),
  language: z.string()
});

export type HierarchyData = z.infer<typeof HierarchyData>;

export const HierarchyLevel = z.object({
  level: z.number(),
  type: z.string(),
  data: HierarchyData
});

export type HierarchyLevel = z.infer<typeof HierarchyLevel>;

export const SeoData = z.object({
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  meta_keywords: z.string().optional()
});

export type SeoData = z.infer<typeof SeoData>;

export const Article = z.object({
  id: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  type: z.number(),
  category_id: z.number(),
  folder_id: z.number(),
  hierarchy: HierarchyLevel.array(),
  thumbs_up: z.number(),
  thumbs_down: z.number(),
  hits: z.number(),
  tags: z.string().array().optional(),
  seo_data: SeoData,
  agent_id: z.number(),
  title: z.string(),
  description: z.string(),
  description_text: z.string(),
  status: z.number()
});

export type Article = z.infer<typeof Article>;

export const Ticket = z.object({
  id: z.string(),
  type: z.string(),
  priority: z.number(),
  request_id: z.number(),
  response_id: z.number(),
  source: z.number(),
  subject: z.string(),
  to_emails: z.union([z.string().array(), z.null()]),
  created_at: z.string(),
  updated_at: z.string(),
  is_escalated: z.boolean()
});

export type Ticket = z.infer<typeof Ticket>;

export const models = {
  IdEntity: IdEntity,
  SuccessResponse: SuccessResponse,
  CreateUser: CreateUser,
  FreshdeskCreateUser: FreshdeskCreateUser,
  User: User,
  Contact: Contact,
  CreateContact: CreateContact,
  Timestamps: Timestamps,
  HierarchyData: HierarchyData,
  HierarchyLevel: HierarchyLevel,
  SeoData: SeoData,
  Article: Article,
  Ticket: Ticket
};