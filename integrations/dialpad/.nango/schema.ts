export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface SyncMetadata_dialpad_users {
};

export interface ActionInput_dialpad_createuser {
  firstName: string;
  lastName: string;
  email: string;
  license?: string | undefined;
  officeId?: string | undefined;
  autoAssign?: boolean | undefined;
};

export interface ActionOutput_dialpad_createuser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export interface ActionInput_dialpad_deleteuser {
  id: string;
};

export interface ActionOutput_dialpad_deleteuser {
  success: boolean;
};
