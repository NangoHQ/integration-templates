export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
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

export interface SyncMetadata_ring_central_contacts {
};

export interface SyncMetadata_ring_central_users {
};

export interface ActionInput_ring_central_createcontact {
  firstName?: string | undefined;
  lastName?: string | undefined;
  email?: string | undefined;
  phoneNumbers: ({  type: 'work' | 'mobile' | 'other';
  value: string;})[];
  company?: string | undefined;
  jobTitle?: string | undefined;
  notes?: string | undefined;
};

export interface ActionOutput_ring_central_createcontact {
  id: string;
  firstName?: string | undefined;
  lastName?: string | undefined;
  email?: string | undefined;
  phoneNumbers?: ({  type: 'work' | 'mobile' | 'other';
  value: string;})[] | undefined;
  company?: string | undefined;
  jobTitle?: string | undefined;
  notes?: string | undefined;
};

export interface ActionInput_ring_central_createuser {
  firstName: string;
  lastName: string;
  email: string;
  active?: boolean | undefined;
  externalId?: string | undefined;
  phoneNumbers: ({  type: 'work' | 'mobile' | 'other';
  value: string;})[];
  photos: ({  type: 'photo';
  value: string;})[];
  addresses: ({  type: 'work';
  streetAddress?: string | undefined;
  locality?: string | undefined;
  region?: string | undefined;
  postalCode?: string | undefined;
  country?: string | undefined;})[];
  title?: string | undefined;
  "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"?: {  department: string;} | undefined;
};

export interface ActionOutput_ring_central_createuser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export interface ActionInput_ring_central_deleteuser {
  id: string;
};

export interface ActionOutput_ring_central_deleteuser {
  success: boolean;
};

export type ActionInput_ring_central_getcompanyinfo = void

export interface ActionOutput_ring_central_getcompanyinfo {
  id: string;
  name: string;
  status: string;
  serviceInfo: {  brand: {  id: string;
  name: string;};
  servicePlan: {  id: string;
  name: string;};};
  mainNumber?: string | undefined;
  operator: {  id?: string | undefined;
  extensionNumber?: string | undefined;};
};
