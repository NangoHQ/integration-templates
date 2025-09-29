export interface NamelyTeam {
  id: string;
  name: string;
  email: string;
  updated_at: number; // epoch time
  created_at: number; // epoch time
  links: {
    team_categories: string[]; // array of team category ids
  };
}

export interface NamelyGroup {
  id: string;
  title: string;
  type: string;
  is_team: boolean;
  address: {
    address1: string;
    address2?: string;
    city: string;
    state_id: string;
    zip: string;
    state: string;
    country: string;
    country_id: string;
    phone?: string;
  };
  count: number; // number of profiles associated with this group
  links: {
    group_type: string; // group type to which the group belongs
  };
}

export interface NamelyManager {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_id?: string;
}

interface Thumbnail {
  "75x75": string;
  "75x75c": string;
  "150x150": string;
  "150x150c": string;
  "300x300": string;
  "300x300c": string;
  "450x450": string;
  "550x450c": string;
  "800x800": string;
  "800x800c": string;
}

interface Image {
  id: string;
  filename: string;
  mime_type: string;
  original: string;
  thumbs: Thumbnail;
}

interface JobTitle {
  id: string;
  title: string;
}

interface ReportsTo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface EmployeeType {
  title: "Full Time" | "Part Time" | "Intern" | "Contractor" | "Freelance";
}

interface Group {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
}

interface ProfileLinks {
  job_title: JobTitle;
  groups: Group[];
  teams: Team[];
  "": string; // Empty string key
}

export interface NamelyAddress {
  address1: string;
  address2: string;
  city: string;
  state_id: string;
  country_id: string;
  zip: string;
  phone?: string;
}

interface Salary {
  currency_type: string;
  date: string;
  guid: string;
  pay_group_id: number;
  payroll_job_id: string;
  rate: string;
  yearly_amount: number;
  hourly: boolean;
  amount_raw: string;
  payroll_company: string;
  payroll_job: string;
}

interface Healthcare {
  beneficiary: string;
  amount: string;
  currency_type: string;
}

interface Dental {
  beneficiary: string;
  amount: string;
  currency_type: string;
}

export interface NamelyProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_status: "active" | "pending" | "inactive";
  updated_at: number;
  created_at: number;
  preferred_name: string | null;
  image: Image;
  full_name: string;
  job_title: JobTitle;
  reports_to: ReportsTo[];
  employee_type: EmployeeType;
  access_role: string;
  ethnicity: string | null;
  links: ProfileLinks;
  middle_name: string | null;
  gender: "Male" | "Female" | null;
  job_change_reason:
    | "New Hire"
    | "Salary Change"
    | "Promotion"
    | "Transfer"
    | null;
  terminated_reason: string | null;
  start_date: string;
  departure_date: string;
  employee_id: string;
  personal_email: string;
  dob: string;
  ssn: string;
  marital_status:
    | "Single"
    | "Married"
    | "Civil Partnership"
    | "Separated"
    | "Divorced"
    | null;
  bio: string | null;
  asset_management:
    | "Laptop"
    | "Cell Phone"
    | "Building Keys"
    | "Corporate Card"
    | "Air Card";
  laptop_asset_number: string | null;
  corporate_card_member: string | null;
  key_tag_number: string | null;
  linkedin_url: string | null;
  office_main_number: string | null;
  office_direct_dial: string | null;
  office_phone: string | null;
  office_fax: string | null;
  office_company_mobile: string | null;
  home_phone: string | null;
  mobile_phone: string | null;
  home: NamelyAddress;
  office: NamelyAddress;
  emergency_contact: string | null;
  emergency_contact_phone: string | null;
  resume: string | null;
  current_job_description: string | null;
  job_description: string;
  salary: Salary;
  healthcare: Healthcare;
  healthcare_info: string;
  dental: Dental;
  dental_info: string;
  vision_plan_info: string;
  life_insurance_info: string;
  namely_time_employee_role: string;
  namely_time_manager_role: string;
}

interface Meta {
  count: number;
  total_count: number;
  status: number;
}

interface Links {
  "profiles.job_title": { type: string };
  "profiles.image": { type: string };
  "profiles.groups": { type: string };
  "profiles.teams": { type: string };
}

interface LinkedJobTitle {
  id: string;
  parent_id: string;
  title: string;
  links: {
    job_tier: string;
  };
}

interface FileThumbnail {
  "75x75": string;
  "75x75c": string;
  "150x150": string;
  "150x150c": string;
  "300x300": string;
  "300x300c": string;
  "450x450": string;
  "550x450c": string;
  "800x800": string;
  "800x800c": string;
}

interface File {
  id: string;
  filename: string;
  mime_type: string;
  original: string;
  thumbs: FileThumbnail[];
}

interface GroupAddress {
  address1: string;
  address2: string;
  city: string;
  state_id: string;
  zip: string;
  state: string;
  country: string;
  country_id: string;
  phone: string;
}

export interface LinkedGroup {
  id: string;
  title: string;
  type: string;
  is_team: boolean;
  address: GroupAddress;
  count: number;
  links: {
    group_type: string;
  };
}

interface Linked {
  job_titles: LinkedJobTitle[];
  files: File[];
  groups: LinkedGroup[];
  teams: any[]; // Can be more specific if structure is known
}

export interface NamelyAPIProfileResponse {
  profiles: NamelyProfile[];
  meta: Meta;
  links: Links;
  linked: Linked;
}

export interface NamelyDocumentResponse {
  id: string;
  file_name: string;
  file_type: string;
  uploaded_at: string;
  metadata?: Record<string, any>;
}

export interface NamelyErrorResponse {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface NamelyUpdateProfileInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  job_title?:
    | {
        id?: string;
        title?: string;
      }
    | undefined;
  employment_type?: string;
  home?: {
    address1: string;
    address2?: string;
    city: string;
    state_id: string;
    country_id: string;
    zip: string;
  };
  salary?: {
    currency_type: string;
    date: string;
    yearly_amount: number;
  };
}
