export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface SyncMetadata_bill_users {
};

export interface ActionInput_bill_createuser {
  firstName: string;
  lastName: string;
  email: string;
  roleId?: string | undefined;
  acceptTermsOfService?: boolean | undefined;
};

export interface ActionOutput_bill_createuser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface ActionInput_bill_disableuser {
  id: string;
};

export interface ActionOutput_bill_disableuser {
  success: boolean;
};
