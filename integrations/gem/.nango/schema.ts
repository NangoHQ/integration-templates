export interface SyncMetadata_gem_applications {
};

export interface Application {
  id: string;
  candidate_id: string;
  applied_at: string;
  rejected_at: string | null;
  last_activity_at: string;
  source: {  id: string;
  public_name: string;};
  credited_to: string;
  rejection_reason: {  id: string;
  name: string;
  type: {  id: string;
  name: string;};} | null;
  jobs: ({  id: string;
  name: string;})[];
  job_post_id: string;
  status: string;
  current_stage: {  id: string;
  name: string;};
  deleted_at: string | null;
};

export interface SyncMetadata_gem_candidates {
};

export interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  title: string | null;
  attachments: ({  filename: string;
  url: string;
  type: string;
  created_at: string;})[];
  phone_numbers: ({  type: string;
  value: string;})[];
  email_addresses: ({  type: string;
  value: string;
  is_primary: boolean;})[];
  social_media_addresses: ({  value: string;})[];
  tags: string[];
  educations: ({  id: string;
  school_name: string;
  degree: string;
  discipline: string;
  start_date: string;
  end_date: string;})[];
  employments: ({  id: string;
  company_name: string;
  title: string;
  start_date: string;
  end_date: string;})[];
  linked_user_ids: string[];
  created_at: string;
  updated_at: string | null;
  last_activity: string | null;
  deleted_at: string | null;
  is_private: boolean;
  applications: ({  id: string;
  candidate_id: string;
  applied_at: string;
  rejected_at: string | null;
  last_activity_at: string;
  source: {  id: string;
  public_name: string;};
  credited_to: string;
  rejection_reason: {  id: string;
  name: string;
  type: {  id: string;
  name: string;};} | null;
  jobs: ({  id: string;
  name: string;})[];
  job_post_id: string;
  status: string;
  current_stage: {  id: string;
  name: string;};
  deleted_at: string | null;})[];
  application_ids: string[];
};

export interface SyncMetadata_gem_jobposts {
};

export interface JobPost {
  id: string;
  title: string;
  active: boolean;
  live: boolean;
  first_published_at: string | null;
  job_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export interface SyncMetadata_gem_jobstages {
};

export interface JobStage {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  active: boolean;
  job_id: string;
  priority: number;
  interviews: ({  id: string;
  name: string;
  schedulable: boolean;
  estimated_minutes: number;
  default_interviewer_users: ({  id: string;
  name: string;
  first_name: string;
  last_name: string;
  employee_id: string;})[];
  interview_kit: {  id: string;
  content: string;
  questions: ({  id: string;
  name: string;})[];};
  deleted_at: string | null;
  job_stage_interview_item_id: string;})[];
};

export interface SyncMetadata_gem_jobs {
};

export interface Job {
  id: string;
  name: string;
  requisition_id: string;
  confidential: boolean;
  status: string;
  created_at: string;
  opened_at: string;
  closed_at: string | null;
  deleted_at: string | null;
  updated_at: string;
  is_template: boolean;
  departments: ({  id: string;
  name: string;
  parent_id: string;
  child_ids: string[];
  parent_department_external_id: string;
  child_department_external_ids: string[];
  deleted_at: string;})[];
  offices: ({  id: string;
  name: string;
  location: {  name: string;};
  parent_id: string;
  child_ids: string[];
  parent_office_external_id: string;
  child_office_external_ids: string[];
  deleted_at: string;})[];
  hiring_team: {  hiring_managers: ({  id: string;
  name: string;
  first_name: string;
  last_name: string;
  employee_id: string;})[] | null;
  recruiters: ({  id: string;
  name: string;
  first_name: string;
  last_name: string;
  employee_id: string;})[] | null;
  coordinators: ({  id: string;
  name: string;
  first_name: string;
  last_name: string;
  employee_id: string;})[] | null;
  sourcers: ({  id: string;
  name: string;
  first_name: string;
  last_name: string;
  employee_id: string;})[] | null;};
};

export interface SyncMetadata_gem_locations {
};

export interface Location {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  state: {  name: string;
  abbrev: string;
  iso_code: string;} | null;
  country: {  name: string;
  iso_code: string;};
  zip_code: string;
  address: string;
  phone_number: string | null;
};

export interface SyncMetadata_gem_users {
};

export interface TeamMemberUser {
  id: string;
  name: string;
  email: string;
};

export interface ActionInput_gem_createcandidate {
  created_by: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  emails: ({  email_address: string;
  is_primary: boolean;})[] | null;
  linked_in_handle: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  school: string | null;
  education_info: ({  school?: string | null | undefined;
  parsed_university: string | null;
  parsed_school: string | null;
  start_date: string | null;
  end_date: string | null;
  field_of_study: string | null;
  parsed_major_1: string | null;
  parsed_major_2: string | null;
  degree: string | null;})[] | null;
  work_info: ({  company: string | null;
  title: string | null;
  work_start_date: string | null;
  work_end_date: string | null;
  is_current: boolean | null;})[] | null;
  profile_urls: string[] | null;
  custom_fields: ({  custom_field_id: string;
  value: string;})[] | null;
  phone_number: string | null;
  project_ids: string[] | null;
  sourced_from: string | null;
  autofill: boolean;
};

export interface ActionOutput_gem_createcandidate {
  id: string;
  created_at: number;
  created_by: string;
  last_updated_at: number | null;
  candidate_greenhouse_id: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  weblink: string;
  emails: ({  email_address: string;
  is_primary: boolean;})[];
  phone_number: string | null;
  location: string | null;
  linked_in_handle: string | null;
  profiles: ({  network: string;
  url: string;
  username: string;})[];
  company: string | null;
  title: string | null;
  school: string | null;
  education_info: ({  school?: string | null | undefined;
  parsed_university: string | null;
  parsed_school: string | null;
  start_date: string | null;
  end_date: string | null;
  field_of_study: string | null;
  parsed_major_1: string | null;
  parsed_major_2: string | null;
  degree: string | null;})[];
  work_info: ({  company: string | null;
  title: string | null;
  work_start_date: string | null;
  work_end_date: string | null;
  is_current: boolean | null;})[];
  custom_fields: ({  id: string;
  name: string;
  scope: string;
  project_id?: string | undefined;
  value?: any | undefined;
  value_type: string;
  value_option_ids?: string[] | undefined;
  custom_field_category?: string | undefined;
  custom_field_value?: any | undefined;})[];
  due_date: {  date: string;
  user_id: string;
  note: string | null;} | null;
  project_ids: string[] | null;
  sourced_from: string | null;
  gem_source: string | null;
};

export interface ActionInput_gem_createnote {
  user_id: string;
  body: string;
  visibility: 'private' | 'public';
  candidate_id: string;
};

export interface ActionOutput_gem_createnote {
  id: string;
  created_at: string;
  body: string;
  user: {  id: string;
  name: string;
  first_name: string;
  last_name: string;
  employee_id: string;};
  private: boolean;
  visibility: 'public' | 'private';
};

export interface ActionInput_gem_updateapplication {
  source_id: string;
  application_id: string;
};

export interface ActionOutput_gem_updateapplication {
  id: string;
  candidate_id: string;
  applied_at: string;
  rejected_at: string | null;
  last_activity_at: string;
  source: {  id: string;
  public_name: string;};
  credited_to: string;
  rejection_reason: {  id: string;
  name: string;
  type: {  id: string;
  name: string;};} | null;
  jobs: ({  id: string;
  name: string;})[];
  job_post_id: string;
  status: string;
  current_stage: {  id: string;
  name: string;};
  deleted_at: string | null;
};

export interface ActionInput_gem_uploadresume {
  candidate_id: string;
  user_id: string;
  resume_file: string;
};

export interface ActionOutput_gem_uploadresume {
  id: string;
  candidate_id: string;
  created_at: number;
  user_id: string;
  filename: string;
  download_url: string;
};
