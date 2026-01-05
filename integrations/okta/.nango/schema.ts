export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface SyncMetadata_okta_users {
};

export interface ActionInput_okta_addgroup {
  description?: string | undefined;
  name: string;
};

export interface ActionOutput_okta_addgroup {
  id: string;
  created: string;
  lastMembershipUpdated: string;
  lastUpdated: string;
  objectClass: string[];
  type: 'APP_GROUP' | 'BUILT_IN' | 'OKTA_GROUP';
  profile: {  description: string | null;
  name: string;} | {  description: string;
  dn: string;
  externalId: string;
  name: string;
  samAccountName: string;
  windowsDomainQualifiedName: string;};
};

export interface ActionInput_okta_addusergroup {
  groupId: string;
  userId: string;
};

export interface ActionOutput_okta_addusergroup {
  success: boolean;
};

export interface ActionInput_okta_createuser {
  firstName: string;
  lastName: string;
  email: string;
  login: string;
  mobilePhone?: string | null | undefined;
};

export interface ActionOutput_okta_createuser {
  id: string;
  status: string;
  created: string;
  activated: string;
  statusChanged: string;
  lastLogin: string | null;
  lastUpdated: string;
  passwordChanged: string | null;
  type: {  id: string;};
  profile: {  firstName: string | null;
  lastName: string | null;
  mobilePhone: string | null;
  secondEmail: string | null;
  login: string;
  email: string;};
};

export interface ActionInput_okta_removeusergroup {
  groupId: string;
  userId: string;
};

export interface ActionOutput_okta_removeusergroup {
  success: boolean;
};
