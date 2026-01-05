export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface SyncMetadata_metabase_users {
};

export interface ActionInput_metabase_createuser {
  firstName: string;
  lastName: string;
  email: string;
};

export interface ActionOutput_metabase_createuser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  active?: boolean | undefined;
};

export interface ActionInput_metabase_disableuser {
  id: number;
};

export interface ActionOutput_metabase_disableuser {
  success: boolean;
};

export interface ActionInput_metabase_enableuser {
  id: number;
};

export interface ActionOutput_metabase_enableuser {
  success: boolean;
};

export interface ActionInput_metabase_fetchuser {
  id: number;
};

export interface ActionOutput_metabase_fetchuser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  active?: boolean | undefined;
};

export interface ActionInput_metabase_updateuser {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  is_group_manager: boolean | null;
  locale: string | null;
  is_superuser: boolean | null;
};

export interface ActionOutput_metabase_updateuser {
  success: boolean;
};
