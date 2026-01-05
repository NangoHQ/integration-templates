export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface SyncMetadata_keeper_scim_users {
};

export interface ActionInput_keeper_scim_createuser {
  firstName: string;
  lastName: string;
  email: string;
  active?: boolean | undefined;
  externalId?: string | undefined;
  phoneNumbers: ({  type: 'work' | 'mobile' | 'other';
  value: string;})[];
  photos: ({  type: 'photo' | 'thumbnail';
  value: string;})[];
  addresses: ({  type: 'work';
  streetAddress?: string | undefined;
  locality?: string | undefined;
  region?: string | undefined;
  postalCode?: string | undefined;
  country?: string | undefined;})[];
  title?: string | undefined;
};

export interface ActionOutput_keeper_scim_createuser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export interface ActionInput_keeper_scim_deleteuser {
  id: string;
};

export interface ActionOutput_keeper_scim_deleteuser {
  success: boolean;
};
