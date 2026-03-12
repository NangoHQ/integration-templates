export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface Task {
  id: string;
  type: string | null;
  title: string | null;
  priority: string | null;
  assignee_id: string | null;
  due_date: string | null;
  notes: string | null;
  contact_ids: string[];
  company_ids: string[];
  deal_ids: string[];
  created_at: string | null;
  updated_at: string | null;
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

export interface Company {
  id: string;
  name: string | null;
  domain: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export interface Deal {
  id: string;
  name: string | null;
  amount: number | null;
  close_date: string | null;
  stage: string | null;
  owner_id: string | null;
  description: string | null;
  company_ids: string[];
  contact_ids: string[];
  updated_at: string;
};

export interface MarketingEmail {
  id: string;
  name: string | null;
  subject: string | null;
  type: string | null;
  isPublished: boolean | null;
  state: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  author: string | null;
  contentType: string | null;
};

export interface Owner {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  user_id: number | null;
  archived: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export interface Product {
  id: string;
  name: string | null;
  description: string | null;
  sku: string | null;
  price: number | null;
  cost_of_goods_sold: number | null;
  billing_frequency: string | null;
  recurring_billing_period: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export interface ActionInput_hubspot_batchcreatecompanies {
  /**
   * Array of companies to create
   */
  companies: ({  /**
   * Company name. Example: "Acme Inc"
   */
  name?: string | undefined;
  /**
   * Company domain. Example: "acme.com"
   */
  domain?: string | undefined;
  /**
   * City. Example: "San Francisco"
   */
  city?: string | undefined;
  /**
   * Industry. Example: "Technology"
   */
  industry?: string | undefined;})[];
};

export interface ActionOutput_hubspot_batchcreatecompanies {
  companies: ({  id: string;
  name: string | null;
  domain: string | null;
  city: string | null;
  industry: string | null;
  created_at: string | null;
  updated_at: string | null;})[];
};

export interface ActionInput_hubspot_batchupdatecompanies {
  /**
   * Array of companies to update (max 100 per request).
   */
  companies: ({  /**
   * The HubSpot company ID. Example: "123456789"
   */
  id: string;
  /**
   * The company name.
   */
  name?: string | undefined;
  /**
   * The company domain.
   */
  domain?: string | undefined;
  /**
   * The industry the company operates in.
   */
  industry?: string | undefined;
  /**
   * The city where the company is located.
   */
  city?: string | undefined;
  /**
   * The state where the company is located.
   */
  state?: string | undefined;
  /**
   * The country where the company is located.
   */
  country?: string | undefined;
  /**
   * The company phone number.
   */
  phone?: string | undefined;
  /**
   * The company website URL.
   */
  website?: string | undefined;})[];
};

export interface ActionOutput_hubspot_batchupdatecompanies {
  results: ({  id: string;
  name: string | null;
  domain: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  website: string | null;
  created_at: string | null;
  updated_at: string | null;})[];
  status: string;
};

export interface ActionInput_hubspot_changeuserrole {
  /**
   * User ID or email. Example: "12345" or "user@example.com"
   */
  user_id: string;
  /**
   * Property type for the user_id. Use EMAIL if user_id is an email, USER_ID if it is a user ID.
   */
  id_property?: 'EMAIL' | 'USER_ID' | undefined;
  /**
   * Role ID to assign to the user. Example: "1234"
   */
  role_id?: string | undefined;
  /**
   * Primary team ID to assign to the user. Example: "5678"
   */
  primary_team_id?: string | undefined;
  /**
   * Array of secondary team IDs to assign to the user. Example: ["9101", "1121"]
   */
  secondary_team_ids?: string[] | undefined;
};

export interface ActionOutput_hubspot_changeuserrole {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role_ids: string[];
  primary_team_id: string | null;
  secondary_team_ids: string[];
  super_admin: boolean;
};

export interface ActionInput_hubspot_clonemarketingemail {
  /**
   * The email ID to clone. Example: "38175169118"
   */
  email_id: string;
  /**
   * The name to assign to the cloned email. Example: "Cloned Newsletter"
   */
  clone_name?: string | undefined;
  /**
   * The language code for the cloned email, such as "en" for English. Example: "en"
   */
  language?: string | undefined;
};

export interface ActionOutput_hubspot_clonemarketingemail {
  id: string;
  name: string | null;
  subject: string | null;
  state: string | null;
  created_at: string | null;
  updated_at: string | null;
  cloned_from: string | null;
  is_published: boolean | null;
  is_transactional: boolean | null;
  type: string | null;
  subcategory: string | null;
};

export interface ActionInput_hubspot_createassociation {
  /**
   * The type of the object to associate from. Example: "contacts", "companies", "deals", "tickets"
   */
  from_object_type: string;
  /**
   * The ID of the object to associate from. Example: "12345"
   */
  from_object_id: string;
  /**
   * The type of the object to associate to. Example: "contacts", "companies", "deals", "tickets"
   */
  to_object_type: string;
  /**
   * The ID of the object to associate to. Example: "67890"
   */
  to_object_id: string;
  /**
   * The association type identifier. If not provided, a default association will be created.
   */
  association_type?: string | undefined;
  /**
   * The category of the association type. Required if association_type is provided.
   */
  association_category?: 'HUBSPOT_DEFINED' | 'USER_DEFINED' | 'INTEGRATOR_DEFINED' | undefined;
};

export interface ActionOutput_hubspot_createassociation {
  status: string;
  results: ({  from_id: string;
  to_id: string;
  association_type: string | null;
  association_category: string | null;})[];
  started_at: string;
  completed_at: string;
};

export interface ActionInput_hubspot_createcompany {
  /**
   * Company name. Example: "Acme Inc."
   */
  name?: string | undefined;
  /**
   * Company domain. Example: "acme.com"
   */
  domain?: string | undefined;
  /**
   * Company city. Example: "San Francisco"
   */
  city?: string | undefined;
  /**
   * Company industry. Example: "Software"
   */
  industry?: string | undefined;
  /**
   * Company phone number. Example: "+1-555-1234"
   */
  phone?: string | undefined;
  /**
   * Company website URL. Example: "https://acme.com"
   */
  website?: string | undefined;
};

export interface ActionOutput_hubspot_createcompany {
  id: string;
  name: string | null;
  domain: string | null;
  city: string | null;
  industry: string | null;
  phone: string | null;
  website: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export interface ActionInput_hubspot_createcontact {
  /**
   * Email address of the contact. Example: "john.doe@example.com"
   */
  email: string;
  /**
   * First name of the contact. Example: "John"
   */
  firstname?: string | undefined;
  /**
   * Last name of the contact. Example: "Doe"
   */
  lastname?: string | undefined;
  /**
   * Phone number of the contact. Example: "+1 555-1234"
   */
  phone?: string | undefined;
  /**
   * Company name of the contact. Example: "Acme Inc"
   */
  company?: string | undefined;
  /**
   * Website URL of the contact. Example: "https://example.com"
   */
  website?: string | undefined;
};

export interface ActionOutput_hubspot_createcontact {
  id: string;
  email: string | null;
  firstname: string | null;
  lastname: string | null;
  phone: string | null;
  company: string | null;
  website: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export interface ActionInput_hubspot_createdeal {
  /**
   * Deal name. Example: "Acme Corp Deal"
   */
  deal_name?: string | undefined;
  /**
   * Deal amount in company currency. Example: 50000
   */
  amount?: number | undefined;
  /**
   * Deal stage ID. Example: "appointmentscheduled"
   */
  dealstage?: string | undefined;
  /**
   * Pipeline ID. Example: "default"
   */
  pipeline?: string | undefined;
  /**
   * Expected close date. ISO 8601 format. Example: "2025-12-31T23:59:59Z"
   */
  closedate?: string | undefined;
  /**
   * Owner ID to assign the deal to. Example: "12345678"
   */
  hubspot_owner_id?: string | undefined;
};

export interface ActionOutput_hubspot_createdeal {
  id: string;
  deal_name: string | null;
  amount: number | null;
  dealstage: string | null;
  pipeline: string | null;
  closedate: string | null;
  hubspot_owner_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export interface ActionInput_hubspot_createmarketingemail {
  /**
   * The name of the marketing email. Example: "Newsletter March 2024"
   */
  name: string;
  /**
   * The subject line of the email. Example: "Check out our latest updates!"
   */
  subject: string;
  /**
   * The HTML content of the email body.
   */
  html_body?: string | undefined;
  /**
   * The plain text content of the email body.
   */
  text_body?: string | undefined;
  /**
   * The display name for the email sender.
   */
  from_name?: string | undefined;
  /**
   * The email address of the sender.
   */
  from_email?: string | undefined;
  /**
   * The path to a HubSpot template. Example: "@hubspot/email/dnd/welcome.html"
   */
  template_path?: string | undefined;
};

export interface ActionOutput_hubspot_createmarketingemail {
  id: string;
  name: string | null;
  subject: string | null;
  created_at: string | null;
  updated_at: string | null;
  state: string | null;
  campaign_id: string | null;
  content_id: string | null;
};

export interface ActionInput_hubspot_createnote {
  /**
   * The note text content. Limited to 65,536 characters.
   */
  body?: string | undefined;
  /**
   * The note timestamp in ISO 8601 UTC format (e.g., "2021-11-12T15:48:22Z") or Unix timestamp in milliseconds.
   */
  timestamp: string;
  /**
   * The HubSpot owner ID associated with the note.
   */
  owner_id?: string | undefined;
  /**
   * IDs of attachments to associate with the note.
   */
  attachment_ids?: string[] | undefined;
  /**
   * The association to a contact, company, deal, or ticket.
   */
  association: {  /**
   * The type of object to associate the note with.
   */
  object_type: 'contact' | 'company' | 'deal' | 'ticket';
  /**
   * The ID of the record to associate the note with.
   */
  object_id: string;};
};

export interface ActionOutput_hubspot_createnote {
  id: string;
  body: string | null;
  timestamp: string | null;
  owner_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export interface ActionInput_hubspot_createproperty {
  /**
   * The CRM object type for which the property will be created. Example: "contacts"
   */
  object_type: 'contacts' | 'companies' | 'deals' | 'products' | 'tickets' | 'line_items';
  /**
   * The internal name of the property (lowercase, alphanumeric and underscores only). Example: "favorite_food"
   */
  name: string;
  /**
   * The display name of the property as shown in HubSpot. Example: "Favorite Food"
   */
  label: string;
  /**
   * The data type of the property. Example: "string"
   */
  type: 'string' | 'number' | 'bool' | 'enumeration' | 'datetime' | 'date' | 'phone_number';
  /**
   * The field type determines the input widget shown in HubSpot. Example: "text"
   */
  field_type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'radio' | 'booleancheckbox' | 'file' | 'calculation_equation' | 'calculation_rollup' | 'calculation_score' | 'calculation_date';
  /**
   * The property group the property belongs to. Defaults to "contactinformation". Example: "contactinformation"
   */
  group_name?: string | undefined;
  /**
   * A description of the property. Example: "The users favorite food"
   */
  description?: string | undefined;
  /**
   * The order the property appears in its group. Example: 1
   */
  display_order?: number | undefined;
  /**
   * Required for enumeration field types (select, checkbox, radio). Array of option objects with label and value.
   */
  options?: ({  label: string;
  value: string;
  display_order?: number | undefined;
  hidden?: boolean | undefined;})[];
};

export interface ActionOutput_hubspot_createproperty {
  name: string;
  label: string;
  type: string;
  field_type: string;
  group_name: string;
  description: string | null;
  display_order: number | null;
  created_at: string | null;
  updated_at: string | null;
  archived: boolean;
  archived_at: string | null;
  options?: ({  label: string;
  value: string;
  display_order: number | null;
  hidden: boolean;})[] | undefined;
};

export interface ActionInput_hubspot_createtask {
  /**
   * The title/subject of the task. Example: "Call John about the proposal"
   */
  subject: string;
  /**
   * The type of task. Example: "CALL", "EMAIL", "TODO", "MEETING", "LINKED_IN", "LINKED_IN_MESSAGE", "LINKED_IN_CONNECT", "WHATSAPP", "SMS", "NEXT_STEP", "SCHEDULE_MEETING", "DEMO". Defaults to "TODO"
   */
  type?: string | undefined;
  /**
   * The priority of the task. Options: "LOW", "MEDIUM", "HIGH". Defaults to "MEDIUM"
   */
  priority?: string | undefined;
  /**
   * The due date for the task in ISO 8601 format (e.g., "2024-03-15T10:00:00Z"). Example: "2024-03-15T10:00:00Z"
   */
  due_date: string;
  /**
   * The body/notes of the task. Example: "Remember to mention the discount offer"
   */
  notes?: string | undefined;
  /**
   * The HubSpot owner ID (user ID) to assign the task to. Example: "12345678"
   */
  assignee_id?: string | undefined;
  /**
   * Array of contact IDs to associate the task with. Example: ["123", "456"]
   */
  contact_ids?: string[] | undefined;
  /**
   * Array of company IDs to associate the task with. Example: ["789", "012"]
   */
  company_ids?: string[] | undefined;
  /**
   * Array of deal IDs to associate the task with. Example: ["345", "678"]
   */
  deal_ids?: string[] | undefined;
};

export interface ActionOutput_hubspot_createtask {
  /**
   * The unique ID of the created task
   */
  id: string;
  /**
   * The title/subject of the task
   */
  subject: string | null;
  /**
   * The type of task
   */
  type: string | null;
  /**
   * The priority of the task
   */
  priority: string | null;
  /**
   * The due date of the task
   */
  due_date: string | null;
  /**
   * The body/notes of the task
   */
  notes: string | null;
  /**
   * The status of the task
   */
  status: string | null;
  /**
   * The HubSpot owner ID assigned to the task
   */
  assignee_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export interface ActionInput_hubspot_createticket {
  /**
   * The ticket subject/title. Example: "Support request for login issue"
   */
  subject: string;
  /**
   * The ticket description/content. Example: "User cannot log in to their account"
   */
  content?: string | undefined;
  /**
   * Pipeline ID. Example: "0"
   */
  hs_pipeline?: string | undefined;
  /**
   * Pipeline stage ID. Example: "1"
   */
  hs_pipeline_stage?: string | undefined;
  /**
   * Ticket priority level
   */
  hs_ticket_priority?: 'LOW' | 'MEDIUM' | 'HIGH' | undefined;
};

export interface ActionOutput_hubspot_createticket {
  id: string;
  subject: string | null;
  content: string | null;
  hs_pipeline: string | null;
  hs_pipeline_stage: string | null;
  hs_ticket_priority: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export interface ActionInput_hubspot_createuser {
  /**
   * The email address of the user to create. Example: "user@example.com"
   */
  email: string;
  /**
   * The first name of the user. Example: "John"
   */
  first_name?: string | undefined;
  /**
   * The last name of the user. Example: "Doe"
   */
  last_name?: string | undefined;
  /**
   * The ID of the role/permission set to assign to the user. Example: "12345"
   */
  role_id?: string | undefined;
  /**
   * The ID of the primary team to assign the user to. Example: "67890"
   */
  team_id?: string | undefined;
  /**
   * Whether to send a welcome email to the user. Defaults to true if not specified.
   */
  send_welcome_email?: boolean | undefined;
};

export interface ActionOutput_hubspot_createuser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role_id: string | null;
  team_id: string | null;
  created_at: string | null;
};

export interface ActionInput_hubspot_deleteaworkflow {
  /**
   * The unique identifier for the workflow to delete. Example: "123456789"
   */
  workflow_id: string;
};

export interface ActionOutput_hubspot_deleteaworkflow {
  success: boolean;
  workflow_id: string;
};

export interface ActionInput_hubspot_deletecompany {
  /**
   * HubSpot Company ID to delete. Example: "123456789"
   */
  id: string;
};

export interface ActionOutput_hubspot_deletecompany {
  success: boolean;
  id: string;
};

export interface ActionInput_hubspot_deletecontact {
  /**
   * The ID of the contact to delete. Example: "12345"
   */
  contact_id: string;
};

export interface ActionOutput_hubspot_deletecontact {
  success: boolean;
  contact_id: string;
};

export interface ActionInput_hubspot_deletedeal {
  /**
   * The ID of the deal to delete. Example: "12345"
   */
  deal_id: string;
};

export interface ActionOutput_hubspot_deletedeal {
  success: boolean;
  message: string;
};

export interface ActionInput_hubspot_deletemarketingemail {
  /**
   * The ID of the marketing email to delete. Example: "12345"
   */
  email_id: string;
};

export interface ActionOutput_hubspot_deletemarketingemail {
  success: boolean;
  email_id: string;
  message: string;
};

export interface ActionInput_hubspot_deletetask {
  /**
   * HubSpot task record ID to delete. Example: "12345"
   */
  task_id: string;
};

export interface ActionOutput_hubspot_deletetask {
  success: boolean;
  task_id: string;
};

export interface ActionInput_hubspot_deleteticket {
  /**
   * The ID of the ticket to delete. Example: "12345"
   */
  ticket_id: string;
};

export interface ActionOutput_hubspot_deleteticket {
  success: boolean;
  ticket_id: string;
};

export interface ActionInput_hubspot_deleteuser {
  /**
   * HubSpot user ID. Example: "12345678". Can also be an email address if using the optional idProperty query parameter.
   */
  user_id: string;
  /**
   * Property to use for identifying the user. Defaults to USER_ID. Use EMAIL if passing an email address as user_id.
   */
  id_property?: 'USER_ID' | 'EMAIL' | undefined;
};

export interface ActionOutput_hubspot_deleteuser {
  id: string;
  deleted: boolean;
};

export interface ActionInput_hubspot_fetchaccountinformation {
};

export interface ActionOutput_hubspot_fetchaccountinformation {
  portal_id: number;
  account_type: string | null;
  timezone: string | null;
  company_currency: string | null;
  additional_currencies: string[];
  data_hosting_location: string | null;
  ui_domain: string | null;
  utc_offset: string | null;
  utc_offset_milliseconds: number | null;
};

export interface ActionInput_hubspot_fetchcustomobjects {
};

export interface ActionOutput_hubspot_fetchcustomobjects {
  custom_objects: ({  id: string;
  name: string | null;
  object_type_id: string | null;
  fully_qualified_name: string | null;
  singular_label: string | null;
  plural_label: string | null;
  description: string | null;
  primary_display_property: string | null;
  secondary_display_properties?: string[] | undefined;
  required_properties?: string[] | undefined;
  searchable_properties?: string[] | undefined;})[];
};

export interface ActionInput_hubspot_fetchpipelines {
  /**
   * The object type for which to fetch pipelines (e.g., "deals", "tickets"). Defaults to "deals".
   */
  object_type?: string | undefined;
};

export interface ActionOutput_hubspot_fetchpipelines {
  pipelines: ({  id: string;
  label: string | null;
  display_order: number | null;
  active: boolean | null;
  stages: ({  id: string;
  label: string | null;
  display_order: number | null;
  metadata?: {  [key: string]: any | undefined;};})[];
  created_at: string | null;
  updated_at: string | null;})[];
};

export interface ActionInput_hubspot_fetchproperties {
  /**
   * The CRM object type to fetch properties for (e.g., contacts, companies, deals, tickets). Example: "companies"
   */
  object_type: string;
};

export interface ActionOutput_hubspot_fetchproperties {
  /**
   * The requested object type
   */
  object_type: string;
  /**
   * List of property metadata for the object type
   */
  properties: ({  /**
   * Internal property name
   */
  name: string;
  /**
   * Display name of the property
   */
  label: string;
  /**
   * Data type (string, number, bool, datetime, enumeration, etc.)
   */
  type: string;
  /**
   * UI field type (text, select, checkbox, etc.)
   */
  field_type: string;
  /**
   * Property description
   */
  description: string | null;
  /**
   * Property group name
   */
  group_name: string | null;
  /**
   * Whether the property is read-only
   */
  read_only: boolean;
  /**
   * Whether the property is hidden
   */
  hidden: boolean;
  /**
   * Whether the property is archived
   */
  archived: boolean;
  /**
   * Available options for enumeration type properties
   */
  options?: ({  label: string;
  value: string;
  display_order?: number | undefined;
  hidden?: boolean | undefined;})[];
  created_at: string | null;
  updated_at: string | null;})[];
};

export interface ActionInput_hubspot_fetchroles {
};

export interface ActionOutput_hubspot_fetchroles {
  roles: ({  id: string;
  name: string;
  requires_billing_write: boolean;})[];
};

export interface ActionInput_hubspot_getcompany {
  /**
   * Company ID to retrieve
   */
  id: string;
};

export interface ActionOutput_hubspot_getcompany {
  id: string;
  name: string | null;
  domain: string | null;
  industry: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export interface ActionInput_hubspot_getcontact {
  /**
   * HubSpot contact ID. Example: "123"
   */
  contact_id: string;
};

export interface ActionOutput_hubspot_getcontact {
  id: string;
  email: string | null;
  firstname: string | null;
  lastname: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export interface ActionInput_hubspot_getdeal {
  /**
   * The ID of the deal to retrieve. Example: "12345678"
   */
  deal_id: string;
};

export interface ActionOutput_hubspot_getdeal {
  id: string;
  deal_name: string | null;
  deal_stage: string | null;
  pipeline: string | null;
  amount: string | null;
  close_date: string | null;
  create_date: string | null;
  hubspot_owner_id: string | null;
  updated_at: string | null;
};

export interface ActionInput_hubspot_getmarketingemail {
  /**
   * The ID of the marketing email to retrieve. Example: "38175169118"
   */
  email_id: string;
};

export interface ActionOutput_hubspot_getmarketingemail {
  id: string;
  name: string | null;
  subject: string | null;
  state: string | null;
  type: string | null;
  created_at: string | null;
  updated_at: string | null;
  published_at: string | null;
  is_published: boolean | null;
  is_transactional: boolean | null;
  archived: boolean | null;
};

export interface ActionInput_hubspot_getowner {
  /**
   * HubSpot owner ID. Example: "123"
   */
  owner_id: string;
};

export interface ActionOutput_hubspot_getowner {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export interface ActionInput_hubspot_getticket {
  /**
   * HubSpot ticket ID. Example: "123456789"
   */
  ticket_id: string;
};

export interface ActionOutput_hubspot_getticket {
  id: string;
  subject: string | null;
  content: string | null;
  pipeline: string | null;
  pipeline_stage: string | null;
  priority: string | null;
  source: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export interface ActionInput_hubspot_listcompanies {
  /**
   * Pagination cursor from previous response. Omit for first page.
   */
  cursor?: string | undefined;
};

export interface ActionOutput_hubspot_listcompanies {
  items: ({  id: string;
  name: string | null;
  domain: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  website: string | null;
  created_at: string | null;
  updated_at: string | null;})[];
  next_cursor: string | null;
};

export interface ActionInput_hubspot_listcontacts {
  /**
   * Pagination cursor from previous response. Omit for first page.
   */
  cursor?: string | undefined;
};

export interface ActionOutput_hubspot_listcontacts {
  contacts: ({  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string | null;
  updated_at: string | null;})[];
  next_cursor: string | null;
};

export interface ActionInput_hubspot_listdeals {
  /**
   * Pagination cursor from previous response. Maps to HubSpot "after" parameter.
   */
  cursor?: string | undefined;
};

export interface ActionOutput_hubspot_listdeals {
  deals: ({  id: string;
  dealname: string | null;
  dealstage: string | null;
  pipeline: string | null;
  amount: number | null;
  closedate: string | null;
  createdate: string | null;
  hs_lastmodifieddate: string | null;})[];
  next_cursor: string | null;
};

export interface ActionInput_hubspot_listforms {
  /**
   * Pagination cursor from previous response. Maps to HubSpot "after" parameter. Omit for first page.
   */
  cursor?: string | undefined;
};

export interface ActionOutput_hubspot_listforms {
  items: ({  id: string;
  name: string | null;
  form_type: string | null;
  created_at: string | null;
  updated_at: string | null;})[];
  next_cursor: string | null;
};

export interface ActionInput_hubspot_listmarketingemails {
  /**
   * Pagination cursor from previous response. Omit for first page.
   */
  cursor?: string | undefined;
};

export interface ActionOutput_hubspot_listmarketingemails {
  emails: ({  id: string;
  name: string | null;
  subject: string | null;
  created_at: string | null;
  updated_at: string | null;
  type: string | null;
  state: string | null;})[];
  next_cursor: string | null;
};

export interface ActionInput_hubspot_listtickets {
  /**
   * Pagination cursor from previous response. Omit for first page.
   */
  cursor?: string | undefined;
  /**
   * Number of tickets to return per page. Max 100.
   */
  limit?: number | undefined;
};

export interface ActionOutput_hubspot_listtickets {
  items: ({  id: string;
  subject: string | null;
  content: string | null;
  hs_pipeline: string | null;
  hs_pipeline_stage: string | null;
  hs_ticket_priority: string | null;
  hs_ticket_category: string | null;
  created_at: string | null;
  updated_at: string | null;})[];
  next_cursor: string | null;
};

export interface ActionInput_hubspot_searchcompanies {
  /**
   * Company name to search for
   */
  name?: string | undefined;
  /**
   * Company domain to search for
   */
  domain?: string | undefined;
  /**
   * Company city to search for
   */
  city?: string | undefined;
  /**
   * Company industry to search for
   */
  industry?: string | undefined;
  /**
   * Pagination cursor from previous response. Omit for first page.
   */
  cursor?: string | undefined;
};

export interface ActionOutput_hubspot_searchcompanies {
  companies: ({  id: string;
  name: string | null;
  domain: string | null;
  city: string | null;
  industry: string | null;
  created_at: string | null;
  updated_at: string | null;})[];
  next_cursor: string | null;
};

export interface ActionInput_hubspot_searchdeals {
  /**
   * Search query to match against default searchable properties (dealname, pipeline, dealstage, description, dealtype)
   */
  query?: string | undefined;
  /**
   * Filter by deal name (uses CONTAINS_TOKEN operator)
   */
  deal_name?: string | undefined;
  /**
   * Filter by deal stage ID
   */
  deal_stage?: string | undefined;
  /**
   * Filter by pipeline ID
   */
  pipeline?: string | undefined;
  /**
   * Filter by minimum deal amount
   */
  min_amount?: number | undefined;
  /**
   * Filter by maximum deal amount
   */
  max_amount?: number | undefined;
  /**
   * Pagination cursor from previous response. Omit for first page.
   */
  cursor?: string | undefined;
  /**
   * Number of results per page (max 200)
   */
  limit?: number | undefined;
};

export interface ActionOutput_hubspot_searchdeals {
  deals: ({  id: string;
  deal_name: string | null;
  amount: number | null;
  deal_stage: string | null;
  pipeline: string | null;
  close_date: string | null;
  created_at: string | null;
  updated_at: string | null;})[];
  next_cursor: string | null;
};

export interface ActionInput_hubspot_searchtickets {
  /**
   * Search query string (up to 3000 characters)
   */
  query?: string | undefined;
  /**
   * Pagination cursor from previous response
   */
  cursor?: string | undefined;
  /**
   * Maximum results to return (1-200, default: 50)
   */
  limit?: number | undefined;
  /**
   * Filter groups for advanced filtering
   */
  filterGroups?: ({  /**
   * Array of filters within this group
   */
  filters: ({  /**
   * The property name to filter on
   */
  propertyName: string;
  /**
   * The filter operator
   */
  operator: 'EQ' | 'NEQ' | 'LT' | 'LTE' | 'GT' | 'GTE' | 'BETWEEN' | 'IN' | 'NOT_IN' | 'HAS_PROPERTY' | 'NOT_HAS_PROPERTY' | 'CONTAINS_TOKEN' | 'NOT_CONTAINS_TOKEN';
  /**
   * The value to match (for single-value operators)
   */
  value?: string | undefined;
  /**
   * The values to match (for multi-value operators like IN)
   */
  values?: string[] | undefined;
  /**
   * The upper boundary for BETWEEN operator
   */
  highValue?: string | undefined;})[];})[];
  /**
   * Filter by ticket subject (convenience filter)
   */
  subject?: string | undefined;
  /**
   * Filter by ticket priority
   */
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | undefined;
  /**
   * Filter by ticket category
   */
  category?: string | undefined;
  /**
   * Filter by pipeline ID
   */
  pipeline?: string | undefined;
  /**
   * Filter by pipeline stage ID
   */
  pipelineStage?: string | undefined;
};

export interface ActionOutput_hubspot_searchtickets {
  /**
   * Array of matching tickets
   */
  tickets: ({  id: string;
  subject: string | null;
  content: string | null;
  priority: string | null;
  category: string | null;
  pipeline: string | null;
  pipelineStage: string | null;
  created_at: string | null;
  updated_at: string | null;
  archived: boolean;})[];
  /**
   * Cursor for next page (null if no more results)
   */
  next_cursor: string | null;
  /**
   * Total number of matching results
   */
  total: number;
};

export interface ActionInput_hubspot_updatecompany {
  /**
   * HubSpot company ID. Example: "123456789"
   */
  id: string;
  /**
   * Company name
   */
  name?: string | undefined;
  /**
   * Company domain
   */
  domain?: string | undefined;
  /**
   * City
   */
  city?: string | undefined;
  /**
   * State/Region
   */
  state?: string | undefined;
  /**
   * Country
   */
  country?: string | undefined;
  /**
   * Industry
   */
  industry?: string | undefined;
  /**
   * Phone number
   */
  phone?: string | undefined;
  /**
   * Website URL
   */
  website?: string | undefined;
  /**
   * Company description
   */
  description?: string | undefined;
};

export interface ActionOutput_hubspot_updatecompany {
  id: string;
  name: string | null;
  domain: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  industry: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export interface ActionInput_hubspot_updatecontact {
  /**
   * The ID of the contact to update. Example: "12345"
   */
  contact_id: string;
  /**
   * First name of the contact.
   */
  first_name?: string | undefined;
  /**
   * Last name of the contact.
   */
  last_name?: string | undefined;
  /**
   * Email address of the contact.
   */
  email?: string | undefined;
  /**
   * Phone number of the contact.
   */
  phone?: string | undefined;
  /**
   * Company name of the contact.
   */
  company?: string | undefined;
  /**
   * Job title of the contact.
   */
  job_title?: string | undefined;
};

export interface ActionOutput_hubspot_updatecontact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export interface ActionInput_hubspot_updatedeal {
  /**
   * The ID of the deal to update. Example: "12345"
   */
  deal_id: string;
  /**
   * The name of the deal. Example: "Acme Corp Annual Deal"
   */
  dealname?: string | undefined;
  /**
   * The deal amount in the currency. Example: 50000
   */
  amount?: number | undefined;
  /**
   * The expected close date (ISO 8601 format). Example: "2026-06-30"
   */
  closedate?: string | undefined;
  /**
   * The stage of the deal (internal stage ID). Example: "qualifiedtobuy"
   */
  dealstage?: string | undefined;
  /**
   * The pipeline ID for the deal. Example: "default"
   */
  pipeline?: string | undefined;
};

export interface ActionOutput_hubspot_updatedeal {
  id: string;
  dealname: string | null;
  amount: number | null;
  closedate: string | null;
  dealstage: string | null;
  pipeline: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export interface ActionInput_hubspot_updatemarketingemail {
  /**
   * The ID of the marketing email to update. Example: "123456789"
   */
  email_id: string;
  /**
   * The name of the marketing email.
   */
  name?: string | undefined;
  /**
   * The subject line of the marketing email.
   */
  subject?: string | undefined;
  /**
   * The HTML content of the marketing email.
   */
  html?: string | undefined;
  /**
   * The from email address.
   */
  from_email?: string | undefined;
  /**
   * The from name.
   */
  from_name?: string | undefined;
  /**
   * The reply-to email address.
   */
  reply_to?: string | undefined;
  /**
   * The preview text for the email.
   */
  preview_text?: string | undefined;
};

export interface ActionOutput_hubspot_updatemarketingemail {
  id: string;
  name: string | null;
  subject: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export interface ActionInput_hubspot_updatetask {
  /**
   * The HubSpot task ID to update. Example: "12345"
   */
  task_id: string;
  /**
   * The title of the task.
   */
  subject?: string | undefined;
  /**
   * The task notes/description.
   */
  body?: string | undefined;
  /**
   * The task due date in ISO 8601 format or Unix timestamp in milliseconds.
   */
  due_date?: string | undefined;
  /**
   * The status of the task.
   */
  status?: 'COMPLETED' | 'NOT_STARTED' | undefined;
  /**
   * The priority of the task.
   */
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | undefined;
  /**
   * The type of the task.
   */
  task_type?: 'EMAIL' | 'CALL' | 'TODO' | undefined;
  /**
   * The HubSpot owner ID to assign the task to.
   */
  owner_id?: string | undefined;
  /**
   * Reminder timestamp in Unix milliseconds.
   */
  reminder?: string | undefined;
};

export interface ActionOutput_hubspot_updatetask {
  id: string;
  subject: string | null;
  body: string | null;
  due_date: string | null;
  status: 'COMPLETED' | 'NOT_STARTED' | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  task_type: 'EMAIL' | 'CALL' | 'TODO' | null;
  owner_id: string | null;
  reminder: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export interface ActionInput_hubspot_updateticket {
  /**
   * The ID of the ticket to update. Example: "12345"
   */
  ticket_id: string;
  /**
   * The subject of the ticket. Example: "Support Request"
   */
  subject?: string | undefined;
  /**
   * The content/body of the ticket. Example: "Issue details here"
   */
  content?: string | undefined;
  /**
   * The status of the ticket. Example: "OPEN", "CLOSED", "WAITING"
   */
  status?: string | undefined;
  /**
   * The priority of the ticket. Example: "LOW", "MEDIUM", "HIGH"
   */
  priority?: string | undefined;
  /**
   * The category of the ticket. Example: "BUG", "FEATURE_REQUEST"
   */
  category?: string | undefined;
  /**
   * The pipeline the ticket belongs to. Example: "123"
   */
  pipeline?: string | undefined;
  /**
   * The stage of the ticket in the pipeline. Example: "456"
   */
  pipeline_stage?: string | undefined;
  /**
   * The ID of the ticket owner. Example: "12345"
   */
  owner_id?: string | undefined;
};

export interface ActionOutput_hubspot_updateticket {
  id: string;
  subject: string | null;
  content: string | null;
  status: string | null;
  priority: string | null;
  category: string | null;
  pipeline: string | null;
  pipeline_stage: string | null;
  owner_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export interface ActionInput_hubspot_whoami {
};

export interface ActionOutput_hubspot_whoami {
  id: string;
  email: string;
  hub_id: number;
  hub_domain: string | null;
};
