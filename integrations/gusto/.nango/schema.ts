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

export interface SyncMetadata_gusto_employees {
};

export interface GustoEmployee {
  id: string;
  uuid: string;
  first_name: string;
  last_name: string;
  email: string;
  work_email: string;
  phone: string;
  department: string;
  department_uuid: string;
  manager_uuid: string;
  version: string;
  terminated: boolean;
  onboarded: boolean;
  onboarding_status: string;
  date_of_birth: string;
  has_ssn: boolean;
  custom_fields: ({  id: string;
  company_custom_field_id: string;
  name: string;
  description: string;
  type: string;
  value: string;
  selection_options?: string[] | undefined;})[];
  jobs: ({  id: string;
  title: string;
  hire_date: string;
  payment_unit: string;
  primary: boolean;})[];
};

export interface SyncMetadata_gusto_unifiedemployees {
};

export interface ActionInput_gusto_createemployee {
  firstName: string;
  lastName: string;
  email: string;
  middleInitial?: string | undefined;
  preferredFirstName?: string | undefined;
  dateOfBirth: string;
  ssn?: string | undefined;
  selfOnboarding?: boolean | undefined;
};

export interface ActionOutput_gusto_createemployee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export interface ActionInput_gusto_terminateemployee {
  id: string;
  effectiveDate?: string | undefined;
  runTerminationPayroll?: boolean | undefined;
};

export interface ActionOutput_gusto_terminateemployee {
  success: boolean;
};

export interface ActionInput_gusto_updateemployee {
  id: string;
  version: string;
  firstName?: string | undefined;
  lastName?: string | undefined;
  email?: string | undefined;
  middleInitial?: string | undefined;
  preferredFirstName?: string | undefined;
  dateOfBirth?: string | undefined;
  ssn?: string | undefined;
  twoPercentShareholder?: boolean | undefined;
};

export interface ActionOutput_gusto_updateemployee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};
