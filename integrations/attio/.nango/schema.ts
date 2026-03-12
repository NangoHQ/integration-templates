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
  /**
   * The list slug or UUID to add the entry to. Example: "my-sales-list"
   */
  list_id: string;
  /**
   * The record ID to add to the list. Example: "5829dd6c-0577-40dc-a858-8bd9a0d6aa58"
   */
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
  /**
   * The object type of the parent record. Example: "people" or "companies"
   */
  parent_object: string;
  /**
   * The record ID to attach the note to. Example: "5829dd6c-0577-40dc-a858-8bd9a0d6aa58"
   */
  parent_record_id: string;
  /**
   * The note title. Example: "Meeting Notes"
   */
  title: string;
  /**
   * The note content in plain text or markdown. Example: "Discussed Q4 planning..."
   */
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
  /**
   * The object type slug to create record in. Example: "people" or "companies"
   */
  object_slug: string;
  /**
   * Object containing attribute values to set. Example: {"name": [{"first_name": "John", "last_name": "Doe"}]}
   */
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
  /**
   * Task description. Example: "Follow up with customer"
   */
  content: string;
  /**
   * Due date in ISO format. Example: "2025-12-31T23:59:59.000Z"
   */
  deadline?: string | undefined;
  /**
   * Array of workspace member IDs to assign. Example: ["user-id-123"]
   */
  assignee_ids?: string[] | undefined;
  /**
   * Records to link to this task
   */
  linked_records?: ({  /**
   * Object type. Example: "people"
   */
  target_object: string;
  /**
   * Record ID
   */
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
  /**
   * The list slug or UUID. Example: "my-sales-list"
   */
  list_id: string;
  /**
   * The entry ID to remove. Example: "abc123-def456"
   */
  entry_id: string;
};

export interface ActionOutput_attio_deletelistentry {
  /**
   * Whether the deletion was successful
   */
  success: boolean;
};

export interface ActionInput_attio_deletenote {
  /**
   * The note ID to delete. Example: "abc123-def456"
   */
  note_id: string;
};

export interface ActionOutput_attio_deletenote {
  /**
   * Whether the deletion was successful
   */
  success: boolean;
};

export interface ActionInput_attio_deleterecord {
  /**
   * The object type slug. Example: "people" or "companies"
   */
  object_slug: string;
  /**
   * The record ID to delete. Example: "5829dd6c-0577-40dc-a858-8bd9a0d6aa58"
   */
  record_id: string;
};

export interface ActionOutput_attio_deleterecord {
  /**
   * Whether the deletion was successful
   */
  success: boolean;
};

export interface ActionInput_attio_deletewebhook {
  webhook_id: string;
};

export interface ActionOutput_attio_deletewebhook {
  success: boolean;
};

export interface ActionInput_attio_getobject {
  /**
   * UUID or slug to identify the object. Example: "people" or "97052eb9-e65e-443f-a297-f2d9a4a7f795"
   */
  object_id: string;
};

export interface ActionOutput_attio_getobject {
  data: {  id: {  /**
   * Workspace ID. Example: "6f73b7c5-b2d4-48a9-a82b-e68b48c315a6"
   */
  workspace_id: string;
  /**
   * Object ID. Example: "97052eb9-e65e-443f-a297-f2d9a4a7f795"
   */
  object_id: string;};
  /**
   * Unique, human-readable slug for the object. Example: "people"
   */
  api_slug: string;
  /**
   * Singular form of the object name. Example: "Person"
   */
  singular_noun: string;
  /**
   * Plural form of the object name. Example: "People"
   */
  plural_noun: string;
  /**
   * When the object was created. Example: "2023-01-01T00:00:00.000Z"
   */
  created_at: string;};
};

export interface ActionInput_attio_getrecord {
  /**
   * The object type slug. Example: "people" or "companies"
   */
  object_slug: string;
  /**
   * The record ID to retrieve. Example: "5829dd6c-0577-40dc-a858-8bd9a0d6aa58"
   */
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
  /**
   * Array of list objects
   */
  data: ({  id: {  workspace_id: string;
  list_id: string;};
  /**
   * Unique slug for the list. Example: "my-sales-list"
   */
  api_slug: string;
  /**
   * Display name of the list. Example: "My Sales List"
   */
  name: string;
  /**
   * Object types this list is for. Example: ["people"]
   */
  parent_object: string[];
  /**
   * When the list was created
   */
  created_at: string;})[];
};

export interface ActionInput_attio_listnotes {
  /**
   * The object type of the parent record. Example: "people" or "companies"
   */
  parent_object: string;
  /**
   * The record ID to list notes for. Example: "5829dd6c-0577-40dc-a858-8bd9a0d6aa58"
   */
  parent_record_id: string;
  /**
   * Maximum number of notes to return
   */
  limit?: number | undefined;
  /**
   * Number of notes to skip
   */
  offset?: number | undefined;
};

export interface ActionOutput_attio_listnotes {
  /**
   * Array of notes
   */
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
  /**
   * Array of object definitions
   */
  data: ({  id: {  /**
   * Workspace ID. Example: "6f73b7c5-b2d4-48a9-a82b-e68b48c315a6"
   */
  workspace_id: string;
  /**
   * Object ID. Example: "97052eb9-e65e-443f-a297-f2d9a4a7f795"
   */
  object_id: string;};
  /**
   * Unique, human-readable slug for the object. Example: "people"
   */
  api_slug: string;
  /**
   * Singular form of the object name. Example: "Person"
   */
  singular_noun: string;
  /**
   * Plural form of the object name. Example: "People"
   */
  plural_noun: string;
  /**
   * When the object was created. Example: "2023-01-01T00:00:00.000Z"
   */
  created_at: string;})[];
};

export interface ActionInput_attio_listrecords {
  /**
   * The object type slug to query records from. Example: "people" or "companies"
   */
  object_slug: string;
  /**
   * Maximum number of records to return. Default: 25
   */
  limit?: number | undefined;
  /**
   * Number of records to skip. Default: 0
   */
  offset?: number | undefined;
};

export interface ActionOutput_attio_listrecords {
  /**
   * Array of record objects
   */
  data: ({  id: {  workspace_id: string;
  object_id: string;
  record_id: string;};
  created_at: string;
  /**
   * Object containing attribute values keyed by attribute slug
   */
  values: {  [key: string]: any | undefined;};})[];
};

export interface ActionInput_attio_listtasks {
  /**
   * Maximum number of tasks to return
   */
  limit?: number | undefined;
  /**
   * Number of tasks to skip
   */
  offset?: number | undefined;
};

export interface ActionOutput_attio_listtasks {
  /**
   * Array of tasks
   */
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
  /**
   * The object type slug. Example: "people" or "companies"
   */
  object_slug: string;
  /**
   * The record ID to update. Example: "5829dd6c-0577-40dc-a858-8bd9a0d6aa58"
   */
  record_id: string;
  /**
   * Object containing attribute values to update. Example: {"job_title": [{"value": "CTO"}]}
   */
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
