export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface SyncMetadata_grammarly_users {
};

export interface ActionInput_grammarly_deleteuser {
  email: string;
};

export interface ActionOutput_grammarly_deleteuser {
  success: boolean;
};
