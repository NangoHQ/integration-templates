export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface SyncMetadata_lastpass_users {
};

export interface ActionInput_lastpass_createuser {
  firstName: string;
  lastName: string;
  email: string;
  groups?: string[] | undefined;
  duousername?: string | undefined;
  securidusername?: string | undefined;
  password?: string | undefined;
  password_reset_required?: boolean | undefined;
};

export interface ActionOutput_lastpass_createuser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface ActionInput_lastpass_deleteuser {
  email: string;
};

export interface ActionOutput_lastpass_deleteuser {
  success: boolean;
};
