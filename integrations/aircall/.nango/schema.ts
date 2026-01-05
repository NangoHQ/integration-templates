export interface SyncMetadata_aircall_users {
};

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface ActionInput_aircall_createuser {
  firstName: string;
  lastName: string;
  email: string;
};

export interface ActionOutput_aircall_createuser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export interface ActionInput_aircall_deleteuser {
  id: string;
};

export interface ActionOutput_aircall_deleteuser {
  success: boolean;
};
