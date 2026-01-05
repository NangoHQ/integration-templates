export interface SyncMetadata_attio_companies {
};

export interface AttioCompany {
  id: string;
  workspace_id: string;
  created_at: string;
  web_url: string;
  name?: string | undefined;
  domains?: ({  domain: string;
  root_domain: string;})[] | undefined;
  description?: string | undefined;
  team_member_ids?: string[] | undefined;
  location?: {  country_code?: string | undefined;
  line_1?: string | null | undefined;
  line_2?: string | null | undefined;
  city?: string | undefined;
  state?: string | undefined;
  postal_code?: string | undefined;};
  categories?: string[] | undefined;
  logo_url?: string | undefined;
  twitter_follower_count?: number | undefined;
  foundation_date?: string | undefined;
  estimated_arr_usd?: number | undefined;
  social_links?: {  linkedin?: string[] | undefined;
  twitter?: string[] | undefined;
  facebook?: string[] | undefined;
  instagram?: string[] | undefined;
  angellist?: string[] | undefined;};
};

export interface SyncMetadata_attio_deals {
};

export interface AttioDeal {
  id: string;
  workspace_id: string;
  created_at: string;
  web_url: string;
  name?: string | undefined;
  stage?: string | undefined;
  stage_id?: string | undefined;
  owner_id?: string | undefined;
  value?: number | undefined;
  currency?: string | undefined;
  associated_people_ids?: string[] | undefined;
  associated_company_id?: string | undefined;
};

export interface SyncMetadata_attio_people {
};

export interface AttioPerson {
  id: string;
  workspace_id: string;
  created_at: string;
  web_url: string;
  first_name?: string | undefined;
  last_name?: string | undefined;
  full_name?: string | undefined;
  email_addresses?: ({  email: string;
  domain: string;})[] | undefined;
  phone_numbers?: ({  number: string;
  country_code: string;})[] | undefined;
  job_title?: ({  active_from: string;
  active_until: string | null;
  created_by_actor: {  type: string;
  id: string | null;};
  value: string;
  attribute_type: string;})[] | undefined;
  company_id?: string | undefined;
  description?: ({  active_from: string;
  active_until: string | null;
  created_by_actor: {  type: string;
  id: string | null;};})[] | undefined;
  avatar_url?: ({  active_from: string;
  active_until: string | null;
  created_by_actor: {  type: string;
  id: string | null;};})[] | undefined;
  social_links?: {  linkedin?: string[] | undefined;
  twitter?: string[] | undefined;
  facebook?: string[] | undefined;
  instagram?: string[] | undefined;
  angellist?: string[] | undefined;};
  location?: {  line_1?: string | undefined;
  line_2?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  postal_code?: string | undefined;
  country_code?: string | undefined;};
};

export interface ActionInput_attio_createcompany {
  name: string;
  domains?: string[] | undefined;
  description?: string | undefined;
};

export interface ActionOutput_attio_createcompany {
  id: {  workspace_id: string;
  object_id: string;
  record_id: string;};
  name: string | null;
  domains: string[];
  description: string | null;
  created_at: string;
  web_url: string;
};

export interface ActionInput_attio_createlistentry {
  list_id: string;
  record_id: string;
};

export interface ActionOutput_attio_createlistentry {
  data: {  id: {  workspace_id: string;
  list_id: string;
  entry_id: string;};
  record_id: string;
  created_at: string;};
};

export interface ActionInput_attio_createnote {
  parent_object: string;
  parent_record_id: string;
  title: string;
  content: string;
};

export interface ActionOutput_attio_createnote {
  data: {  id: {  workspace_id: string;
  note_id: string;};
  title: string;
  content_plaintext: string;
  parent_object: string;
  parent_record_id: string;
  created_at: string;};
};

export interface ActionInput_attio_createperson {
  first_name: string;
  last_name: string;
  email_addresses?: string[] | undefined;
  phone_numbers?: string[] | undefined;
  job_title?: string | undefined;
};

export interface ActionOutput_attio_createperson {
  id: {  workspace_id: string;
  object_id: string;
  record_id: string;};
  name: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  created_at: string;
  web_url: string;
};

export interface ActionInput_attio_createrecord {
  object_slug: string;
  values: {  [key: string]: any | undefined;};
};

export interface ActionOutput_attio_createrecord {
  data: {  id: {  workspace_id: string;
  object_id: string;
  record_id: string;};
  created_at: string;
  values: {  [key: string]: any | undefined;};};
};

export interface ActionInput_attio_createtask {
  content: string;
  deadline?: string | undefined;
  assignee_ids?: string[] | undefined;
  linked_records?: ({  target_object: string;
  target_record_id: string;})[] | undefined;
};

export interface ActionOutput_attio_createtask {
  data: {  id: {  workspace_id: string;
  task_id: string;};
  content_plaintext: string;
  deadline_at: string | null;
  is_completed: boolean;
  created_at: string;};
};

export interface ActionInput_attio_createwebhook {
  target_url: string;
  subscriptions: ({  event_type: string;
  filter?: {  "$and"?: ({  field: string;
  operator: string;
  value: string;})[] | undefined;
  "$or"?: ({  field: string;
  operator: string;
  value: string;})[] | undefined;} | null;})[];
};

export interface ActionOutput_attio_createwebhook {
  target_url: string;
  subscriptions: ({  event_type: string;
  filter: {  "$and"?: ({  field: string;
  operator: string;
  value: string;})[] | undefined;
  "$or"?: ({  field: string;
  operator: string;
  value: string;})[] | undefined;} | null;})[];
  id: {  workspace_id: string;
  webhook_id: string;};
  status: 'active' | 'degraded' | 'inactive';
  created_at: string;
  secret: string;
};

export interface ActionInput_attio_deletelistentry {
  list_id: string;
  entry_id: string;
};

export interface ActionOutput_attio_deletelistentry {
  success: boolean;
};

export interface ActionInput_attio_deletenote {
  note_id: string;
};

export interface ActionOutput_attio_deletenote {
  success: boolean;
};

export interface ActionInput_attio_deleterecord {
  object_slug: string;
  record_id: string;
};

export interface ActionOutput_attio_deleterecord {
  success: boolean;
};

export interface ActionInput_attio_deletewebhook {
  webhook_id: string;
};

export interface ActionOutput_attio_deletewebhook {
  success: boolean;
};

export interface ActionInput_attio_getobject {
  object_id: string;
};

export interface ActionOutput_attio_getobject {
  data: {  id: {  workspace_id: string;
  object_id: string;};
  api_slug: string;
  singular_noun: string;
  plural_noun: string;
  created_at: string;};
};

export interface ActionInput_attio_getrecord {
  object_slug: string;
  record_id: string;
};

export interface ActionOutput_attio_getrecord {
  data: {  id: {  workspace_id: string;
  object_id: string;
  record_id: string;};
  created_at: string;
  values: {  [key: string]: any | undefined;};};
};

export interface ActionInput_attio_getwebhook {
  webhook_id: string;
};

export interface ActionOutput_attio_getwebhook {
  target_url: string;
  subscriptions: ({  event_type: string;
  filter: {  "$and"?: ({  field: string;
  operator: string;
  value: string;})[] | undefined;
  "$or"?: ({  field: string;
  operator: string;
  value: string;})[] | undefined;} | null;})[];
  id: {  workspace_id: string;
  webhook_id: string;};
  status: 'active' | 'degraded' | 'inactive';
  created_at: string;
};

export interface ActionInput_attio_listlists {
};

export interface ActionOutput_attio_listlists {
  data: ({  id: {  workspace_id: string;
  list_id: string;};
  api_slug: string;
  name: string;
  parent_object: string[];
  created_at: string;})[];
};

export interface ActionInput_attio_listnotes {
  parent_object: string;
  parent_record_id: string;
  limit?: number | undefined;
  offset?: number | undefined;
};

export interface ActionOutput_attio_listnotes {
  data: ({  id: {  workspace_id: string;
  note_id: string;};
  title: string | null;
  content_plaintext: string;
  parent_object: string;
  parent_record_id: string;
  created_at: string;})[];
};

export interface ActionInput_attio_listobjects {
};

export interface ActionOutput_attio_listobjects {
  data: ({  id: {  workspace_id: string;
  object_id: string;};
  api_slug: string;
  singular_noun: string;
  plural_noun: string;
  created_at: string;})[];
};

export interface ActionInput_attio_listrecords {
  object_slug: string;
  limit?: number | undefined;
  offset?: number | undefined;
};

export interface ActionOutput_attio_listrecords {
  data: ({  id: {  workspace_id: string;
  object_id: string;
  record_id: string;};
  created_at: string;
  values: {  [key: string]: any | undefined;};})[];
};

export interface ActionInput_attio_listtasks {
  limit?: number | undefined;
  offset?: number | undefined;
};

export interface ActionOutput_attio_listtasks {
  data: ({  id: {  workspace_id: string;
  task_id: string;};
  content_plaintext: string;
  deadline_at: string | null;
  is_completed: boolean;
  created_at: string;})[];
};

export interface ActionInput_attio_listwebhooks {
  limit?: number | undefined;
  cursor?: string | undefined;
};

export interface ActionOutput_attio_listwebhooks {
  webhooks: ({  target_url: string;
  subscriptions: ({  event_type: string;
  filter: {  "$and"?: ({  field: string;
  operator: string;
  value: string;})[] | undefined;
  "$or"?: ({  field: string;
  operator: string;
  value: string;})[] | undefined;} | null;})[];
  id: {  workspace_id: string;
  webhook_id: string;};
  status: 'active' | 'degraded' | 'inactive';
  created_at: string;})[];
  next_cursor: string | null;
};

export interface ActionInput_attio_updaterecord {
  object_slug: string;
  record_id: string;
  values: {  [key: string]: any | undefined;};
};

export interface ActionOutput_attio_updaterecord {
  data: {  id: {  workspace_id: string;
  object_id: string;
  record_id: string;};
  created_at: string;
  values: {  [key: string]: any | undefined;};};
};

export interface ActionInput_attio_updatewebhook {
  webhook_id: string;
  target_url?: string | undefined;
  subscriptions?: ({  event_type: string;
  filter?: {  "$and"?: ({  field: string;
  operator: string;
  value: string;})[] | undefined;
  "$or"?: ({  field: string;
  operator: string;
  value: string;})[] | undefined;} | null;})[];
};

export interface ActionOutput_attio_updatewebhook {
  target_url: string;
  subscriptions: ({  event_type: string;
  filter: {  "$and"?: ({  field: string;
  operator: string;
  value: string;})[] | undefined;
  "$or"?: ({  field: string;
  operator: string;
  value: string;})[] | undefined;} | null;})[];
  id: {  workspace_id: string;
  webhook_id: string;};
  status: 'active' | 'degraded' | 'inactive';
  created_at: string;
};
