export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface SyncMetadata_jira_basic_users {
};

export interface ActionInput_jira_basic_createuser {
  firstName: string;
  lastName: string;
  email: string;
  products: string[];
};

export interface ActionOutput_jira_basic_createuser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface ActionInput_jira_basic_deleteuser {
  id: string;
};

export interface ActionOutput_jira_basic_deleteuser {
  success: boolean;
};

export interface ActionInput_jira_basic_fetchteams {
  id: string;
};

export interface ActionOutput_jira_basic_fetchteams {
  teams: ({  id: string;
  name: string;})[];
};
