export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface SyncMetadata_dropbox_files {
  files: string[];
  folders: string[];
};

export interface Document {
  id: string;
  url: string;
  title: string;
  mimeType: string;
  updatedAt: string;
};

export interface SyncMetadata_dropbox_users {
};

export interface ActionInput_dropbox_createuser {
  firstName: string;
  lastName: string;
  email: string;
};

export interface ActionOutput_dropbox_createuser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export interface ActionInput_dropbox_deleteuser {
  id: string;
};

export interface ActionOutput_dropbox_deleteuser {
  success: boolean;
};

export interface ActionInput_dropbox_foldercontent {
  path?: string | undefined;
  cursor?: string | undefined;
};

export interface ActionOutput_dropbox_foldercontent {
  files: ({  id: string;
  path: string;
  title: string;
  modified_date: string;})[];
  folders: ({  id: string;
  path: string;
  title: string;
  modified_date: string;})[];
  next_cursor?: string | undefined;
};
