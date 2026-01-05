export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface SyncMetadata_datadog_users {
};

export interface ActionInput_datadog_createuser {
  firstName: string;
  lastName: string;
  email: string;
};

export interface ActionOutput_datadog_createuser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export interface ActionInput_datadog_disableuser {
  id: string;
};

export interface ActionOutput_datadog_disableuser {
  success: boolean;
};
