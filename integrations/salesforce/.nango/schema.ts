export interface Article {
  title: string;
  id: string;
  url: string;
  locale: string;
  user_segment_id: number | null;
  permission_group_id: number;
  author_id: number;
  body: string;
  comments_disabled: boolean;
  content_tag_ids: number[];
  created_at: string;
  draft: boolean;
  edited_at: string;
  html_url: string;
  label_names: string[];
  outdated: boolean;
  outdated_locales: string[];
  position: number;
  promoted: boolean;
  section_id: number;
  source_locale: string;
  updated_at: string;
  vote_count: number;
  vote_sum: number;
};

export interface Contact {
  name: string;
  id: string;
  external_id: string | null;
  email: string | null;
  tax_number: string | null;
  address_line_1?: string | null | undefined;
  address_line_2?: string | null | undefined;
  city: string | null;
  zip: string | null;
  country: string | null;
  state: string | null;
  phone: string | null;
  subsidiary?: string | null | undefined;
};

export interface Ticket {
  url: string | null;
  id: string;
  external_id: string | null;
  via: {  channel: string;
  source: {  from: {  [key: string]: any | undefined;};
  to: {  [key: string]: any | undefined;};
  rel: string | null;};} | null;
  created_at: string | null;
  updated_at: string | null;
  generated_timestamp: number | null;
  type: string | null;
  subject: string | null;
  raw_subject: string | null;
  description: string | null;
  priority: string | null;
  status: string | null;
  recipient: string | null;
  requester_id: number | null;
  submitter_id: number | null;
  assignee_id: number | null;
  organization_id: number | null;
  group_id: number | null;
  collaborator_ids: number[] | null;
  follower_ids: number[] | null;
  email_cc_ids: number[] | null;
  forum_topic_id: string | null;
  problem_id: string | null;
  has_incidents: boolean | null;
  is_public: boolean | null;
  due_at: string | null;
  tags: string[] | null;
  custom_fields: ({  id: number;
  value: string | null;})[] | null;
  satisfaction_rating: {  [key: string]: any | undefined;} | null;
  sharing_agreement_ids: number[] | null;
  custom_status_id: number | null;
  fields: ({  id: number;
  value: string | null;})[] | null;
  followup_ids: number[] | null;
  ticket_form_id: number | null;
  brand_id: number | null;
  allow_channelback: boolean | null;
  allow_attachments: boolean | null;
  from_messaging_channel: boolean | null;
};

export interface Account {
  id: string;
  code?: string | undefined;
  name: string;
  type: string;
  tax_type: string;
  description: string | null;
  class: string;
  bank_account_type: string;
  reporting_code: string;
  reporting_code_name: string;
  currency_code?: string | undefined;
};

export interface SyncMetadata_salesforce_accounts {
};

export interface SyncMetadata_salesforce_articles {
  customFields: string[];
};

export interface SyncMetadata_salesforce_contacts {
};

export interface SyncMetadata_salesforce_leads {
};

export interface Lead {
  id: string;
  first_name: string | null;
  last_name: string;
  company_name: string;
  email: string | null;
  owner_id: string;
  owner_name: string;
  phone: string | null;
  salutation: string | null;
  title: string | null;
  website: string | null;
  industry: string | null;
  last_modified_date: string;
};

export interface SyncMetadata_salesforce_opportunities {
};

export interface Opportunity {
  id: string;
  opportunity_name: string;
  account_name: string | null;
  account_id: string | null;
  amount: number | null;
  description: string | null;
  close_date: string;
  created_by_id: string;
  created_by: string;
  owner_id: string;
  owner_name: string;
  stage: string;
  probability: number | null;
  type: string | null;
  last_modified_date: string;
};

export interface SyncMetadata_salesforce_tickets {
};

export interface ActionInput_salesforce_createaccount {
  description?: string | undefined;
  website?: string | undefined;
  industry?: string | undefined;
  billing_city?: string | undefined;
  billing_country?: string | undefined;
  owner_id?: string | undefined;
  name: string;
};

export interface ActionOutput_salesforce_createaccount {
  id: string;
  success: boolean;
  errors: any[];
};

export interface ActionInput_salesforce_createcontact {
  first_name?: string | undefined;
  account_id?: string | undefined;
  owner_id?: string | undefined;
  email?: string | undefined;
  mobile?: string | undefined;
  phone?: string | undefined;
  salutation?: string | undefined;
  title?: string | undefined;
  last_name: string;
};

export interface ActionOutput_salesforce_createcontact {
  id: string;
  success: boolean;
  errors: any[];
};

export interface ActionInput_salesforce_createlead {
  first_name?: string | undefined;
  email?: string | undefined;
  owner_id?: string | undefined;
  phone?: string | undefined;
  salutation?: string | undefined;
  title?: string | undefined;
  website?: string | undefined;
  industry?: string | undefined;
  last_name: string;
  company_name: string;
};

export interface ActionOutput_salesforce_createlead {
  id: string;
  success: boolean;
  errors: any[];
};

export interface ActionInput_salesforce_createopportunity {
  account_id?: string | undefined;
  amount?: number | undefined;
  description?: string | undefined;
  created_by_id?: string | undefined;
  owner_id?: string | undefined;
  probability?: number | undefined;
  type?: string | undefined;
  opportunity_name: string;
  close_date: string;
  stage: string;
};

export interface ActionOutput_salesforce_createopportunity {
  id: string;
  success: boolean;
  errors: any[];
};

export interface ActionInput_salesforce_deleteaccount {
  id: string;
};

export interface ActionOutput_salesforce_deleteaccount {
  success: boolean;
};

export interface ActionInput_salesforce_deletecontact {
  id: string;
};

export interface ActionOutput_salesforce_deletecontact {
  success: boolean;
};

export interface ActionInput_salesforce_deletelead {
  id: string;
};

export interface ActionOutput_salesforce_deletelead {
  success: boolean;
};

export interface ActionInput_salesforce_deleteopportunity {
  id: string;
};

export interface ActionOutput_salesforce_deleteopportunity {
  success: boolean;
};

export interface ActionInput_salesforce_fetchfields {
  name: string;
};

export interface ActionOutput_salesforce_fetchfields {
  fields: ({  name: string;
  label: string;
  type: string;
  referenceTo: string[];
  relationshipName: string | null;})[];
  childRelationships: ({  object: string;
  relationshipName: string | null;
  field: string;})[];
  validationRules: ({  id: string;
  name: string;
  errorConditionFormula: string;
  errorMessage: string;})[];
};

export interface ActionInput_salesforce_updateaccount {
  description?: string | undefined;
  website?: string | undefined;
  industry?: string | undefined;
  billing_city?: string | undefined;
  billing_country?: string | undefined;
  owner_id?: string | undefined;
  id: string;
  name?: string | undefined;
};

export interface ActionOutput_salesforce_updateaccount {
  success: boolean;
};

export interface ActionInput_salesforce_updatecontact {
  first_name?: string | undefined;
  account_id?: string | undefined;
  owner_id?: string | undefined;
  email?: string | undefined;
  mobile?: string | undefined;
  phone?: string | undefined;
  salutation?: string | undefined;
  title?: string | undefined;
  id: string;
  last_name?: string | undefined;
};

export interface ActionOutput_salesforce_updatecontact {
  success: boolean;
};

export interface ActionInput_salesforce_updatelead {
  first_name?: string | undefined;
  email?: string | undefined;
  owner_id?: string | undefined;
  phone?: string | undefined;
  salutation?: string | undefined;
  title?: string | undefined;
  website?: string | undefined;
  industry?: string | undefined;
  id: string;
  last_name?: string | undefined;
  company_name?: string | undefined;
};

export interface ActionOutput_salesforce_updatelead {
  success: boolean;
};

export interface ActionInput_salesforce_updateopportunity {
  account_id?: string | undefined;
  amount?: number | undefined;
  description?: string | undefined;
  created_by_id?: string | undefined;
  owner_id?: string | undefined;
  probability?: number | undefined;
  type?: string | undefined;
  id: string;
  opportunity_name?: string | undefined;
  close_date?: string | undefined;
  stage?: string | undefined;
};

export interface ActionOutput_salesforce_updateopportunity {
  success: boolean;
};

export type ActionInput_salesforce_whoami = void

export interface ActionOutput_salesforce_whoami {
  id: string;
  email: string;
};
