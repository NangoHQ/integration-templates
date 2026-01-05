export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface SyncMetadata_notion_contentmetadata {
};

export interface ContentMetadata {
  id: string;
  path?: string | undefined;
  type: 'page' | 'database';
  last_modified: string;
  title?: string | undefined;
  parent_id?: string | undefined;
};

export interface SyncMetadata_notion_databases {
};

export interface NotionCompleteDatabase {
  id: string;
  row: {};
  meta: {  databaseId: string;
  path: string;
  title: string;
  last_modified: string;};
};

export interface SyncMetadata_notion_users {
};

export interface ActionInput_notion_createdatabaserow {
  databaseId: string;
  properties: {};
};

export interface ActionOutput_notion_createdatabaserow {
  success: boolean;
  addedProperties: ({  propertyKey: string;
  notionValue?: any | undefined;})[];
};

export interface ActionInput_notion_fetchcontentmetadata {
  url?: string | undefined;
  id?: string | undefined;
};

export interface ActionOutput_notion_fetchcontentmetadata {
  id: string;
  path?: string | undefined;
  type: 'page' | 'database';
  last_modified: string;
  title?: string | undefined;
  parent_id?: string | undefined;
};
