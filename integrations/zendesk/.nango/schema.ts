export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface Category {
  id: string;
  url: string;
  name: string;
  description: string;
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

export interface SyncMetadata_zendesk_articles {
};

export interface SyncMetadata_zendesk_categories {
};

export interface SyncMetadata_zendesk_sections {
};

export interface Section {
  id: string;
  url: string;
  category_id: number;
  name: string;
  description: string;
};

export interface SyncMetadata_zendesk_tickets {
};

export interface SyncMetadata_zendesk_users {
};

export interface ActionInput_zendesk_createcategory {
  category: {  name: string;
  description?: string | undefined;};
};

export interface ActionOutput_zendesk_createcategory {
  id: string;
  url: string;
  name: string;
  description: string;
};

export interface ActionInput_zendesk_createsection {
  category_id: number;
  section: {  name: string;
  description?: string | undefined;};
};

export interface ActionOutput_zendesk_createsection {
  id: string;
  url: string;
  category_id: number;
  name: string;
  description: string;
};

export interface ActionInput_zendesk_createticket {
  ticket: {  comment: {  body?: string | undefined;
  html_body?: string | undefined;};
  assignee_email?: string | undefined;
  assignee_id?: number | undefined;
  brand_id?: number | undefined;
  due_at?: string | undefined;
  type?: 'problem' | 'incident' | 'question' | 'task' | undefined;
  status?: 'new' | 'open' | 'pending' | 'hold' | 'solved' | 'closed.' | undefined;
  metadata?: {} | undefined;};
};

export interface ActionOutput_zendesk_createticket {
  id: string;
  url: string;
  created_at: string;
  updated_at: string;
  subject: string | null;
  description: string;
  priority: string | null;
  status: string;
};

export interface ActionInput_zendesk_createuser {
  firstName: string;
  lastName: string;
  email: string;
  role?: 'admin' | 'agent' | undefined;
};

export interface ActionOutput_zendesk_createuser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  user_fields?: {  [key: string]: any | undefined;};
};

export interface ActionInput_zendesk_deleteuser {
  id: string;
};

export interface ActionOutput_zendesk_deleteuser {
  success: boolean;
};

export interface ActionInput_zendesk_fetcharticle {
  id: string;
};

export interface ActionOutput_zendesk_fetcharticle {
  article: {  title: string;
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
  vote_sum: number;};
};

export type ActionInput_zendesk_fetcharticles = void

export interface ActionOutput_zendesk_fetcharticles {
  articles: ({  title: string;
  id: string;
  url: string;})[];
};

export interface ActionInput_zendesk_searchtickets {
  query: string;
};

export interface ActionOutput_zendesk_searchtickets {
  tickets: ({  id: string;
  url: string;
  external_id: string | null;
  requester_id: string;
  requester_name: string;
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_avatar: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  subject: string | null;
  description: string;
  priority: string | null;
  tags: string[];})[];
};
