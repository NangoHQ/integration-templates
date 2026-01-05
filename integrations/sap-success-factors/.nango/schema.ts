export interface StandardEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  displayName: string;
  employeeNumber?: string | undefined;
  title?: string | undefined;
  department: {  id: string;
  name: string;};
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'INTERN' | 'TEMPORARY' | 'OTHER';
  employmentStatus: 'ACTIVE' | 'TERMINATED' | 'ON_LEAVE' | 'SUSPENDED' | 'PENDING';
  startDate: string;
  terminationDate?: string | undefined;
  manager?: {  id?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  email?: string | undefined;};
  workLocation: {  name: string;
  type: 'OFFICE' | 'REMOTE' | 'HYBRID';
  primaryAddress?: {  street?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  country?: string | undefined;
  postalCode?: string | undefined;
  type: 'WORK' | 'HOME';};};
  addresses: ({  street?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  country?: string | undefined;
  postalCode?: string | undefined;
  type: 'WORK' | 'HOME';})[];
  phones: ({  type: 'WORK' | 'HOME' | 'MOBILE';
  number: string;})[];
  emails: ({  type: 'WORK' | 'PERSONAL';
  address: string;})[];
  providerSpecific: {};
  createdAt: string;
  updatedAt: string;
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

export interface Employee {
  id: string;
  user_name: string | null;
  first_name?: string | undefined;
  last_name?: string | undefined;
  active?: boolean | undefined;
  email: string;
  role: string;
  department: string;
  site: string;
  country?: string | null | undefined;
  external_id?: string | undefined;
  employment_relationship?: string | undefined;
  phone_number: string | null;
};

export interface SyncMetadata_sap_success_factors_employees {
};

export interface SyncMetadata_sap_success_factors_groups {
};

export interface Group {
  id: string;
  active: boolean;
  created_at: string | null;
  name: string;
};

export interface SyncMetadata_sap_success_factors_locations {
};

export interface SyncMetadata_sap_success_factors_unifiedemployees {
};
