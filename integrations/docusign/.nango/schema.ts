export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface SyncMetadata_docusign_users {
};

export interface ActionInput_docusign_createuser {
  firstName: string;
  lastName: string;
  email: string;
  userName?: string | undefined;
  title?: string | undefined;
  phoneNumber?: string | undefined;
  company?: string | undefined;
  countryCode?: string | undefined;
  activationAccessCode?: string | undefined;
  settings?: {  language?: string | undefined;
  timeZone?: string | undefined;};
  userStatus?: string | undefined;
};

export interface ActionOutput_docusign_createuser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export interface ActionInput_docusign_deleteuser {
  id: string;
};

export interface ActionOutput_docusign_deleteuser {
  success: boolean;
};
