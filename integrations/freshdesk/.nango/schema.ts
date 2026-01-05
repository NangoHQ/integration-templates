export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface SyncMetadata_freshdesk_articles {
};

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

export interface SyncMetadata_freshdesk_contacts {
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

export interface SyncMetadata_freshdesk_tickets {
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

export interface SyncMetadata_freshdesk_users {
};

export interface ActionInput_freshdesk_createcontact {
  name: string;
  email?: string | undefined;
  phone?: string | undefined;
  mobile?: string | undefined;
  twitter_id?: {  type: string;
  unique?: any | undefined;
  required?: any | undefined;};
  unique_external_id?: {  type: string;
  unique?: any | undefined;
  required?: any | undefined;};
  other_emails?: any[] | undefined;
  company_id?: number | undefined;
  view_all_tickets?: boolean | undefined;
  other_companies?: any[] | undefined;
  address?: string | undefined;
  avatar?: {} | undefined;
  custom_fields?: {} | undefined;
  description?: string | undefined;
  job_title?: string | undefined;
  language?: string | undefined;
  tags?: any[] | undefined;
  time_zone?: string | undefined;
  lookup_parameter?: string | undefined;
};

export interface ActionOutput_freshdesk_createcontact {
  id: string;
  active: boolean;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  companyId?: string | undefined;
  phone?: string | null | undefined;
  mobile?: string | null | undefined;
  jobTitle?: string | null | undefined;
};

export interface ActionInput_freshdesk_createuser {
  firstName: string;
  lastName: string;
  email: string;
  ticket_scope?: number | undefined;
  ticketScope?: 'globalAccess' | 'groupAccess' | 'restrictedAccess' | undefined;
  occasional?: boolean | undefined;
  signature?: string | undefined;
  skill_ids: number[];
  group_ids: number[];
  role_ids: number[];
  agent_type?: number | undefined;
  agentType?: 'support' | 'field' | 'collaborator' | undefined;
  language?: string | undefined;
  time_zone?: string | undefined;
  focus_mode?: boolean | undefined;
};

export interface ActionOutput_freshdesk_createuser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export interface ActionInput_freshdesk_deletecontact {
  id: string;
};

export interface ActionOutput_freshdesk_deletecontact {
  success: boolean;
};

export interface ActionInput_freshdesk_deleteuser {
  id: string;
};

export interface ActionOutput_freshdesk_deleteuser {
  success: boolean;
};
