export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface SyncMetadata_google_workspaceorgunits {
};

export interface OrganizationalUnit {
  id: string;
  name: string;
  createdAt: string | null;
  deletedAt: string | null;
  description: string | null;
  path: string | null;
  parentPath: string | null;
  parentId: string | null;
};

export interface SyncMetadata_google_workspaceuseraccesstokens {
};

export interface GoogleWorkspaceUserToken {
  id: string;
  user_id: string;
  app_name: string;
  anonymous_app: boolean;
  scopes: string;
};

export interface SyncMetadata_google_workspaceusers {
  orgsToSync: ({  id: string;
  path: string;})[];
};
