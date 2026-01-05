export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface SyncMetadata_perimeter81_users {
};

export interface ActionInput_perimeter81_createuser {
  firstName: string;
  lastName: string;
  email: string;
  idpType?: string | undefined;
  accessGroups: string[];
  emailVerified?: boolean | undefined;
  inviteMessage?: string | undefined;
  origin?: string | undefined;
  profileData?: {  roleName?: string | undefined;
  phone?: string | undefined;
  icon?: string | undefined;
  origin?: string | undefined;};
};

export interface ActionOutput_perimeter81_createuser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export interface ActionInput_perimeter81_deleteuser {
  id: string;
};

export interface ActionOutput_perimeter81_deleteuser {
  success: boolean;
};
