export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface SyncMetadata_smartsheet_users {
};

export interface ActionInput_smartsheet_createuser {
  firstName: string;
  lastName: string;
  email: string;
};

export interface ActionOutput_smartsheet_createuser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export interface ActionInput_smartsheet_deleteuser {
  id: string;
};

export interface ActionOutput_smartsheet_deleteuser {
  success: boolean;
};

export interface ActionInput_smartsheet_disableuser {
  id: string;
};

export interface ActionOutput_smartsheet_disableuser {
  success: boolean;
};
