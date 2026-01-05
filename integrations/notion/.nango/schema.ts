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

export interface ActionInput_notion_appendblockchildren {
  block_id: string;
  children: any[];
  after?: string | undefined;
};

export interface ActionOutput_notion_appendblockchildren {
  object: string;
  results: any[];
};

export interface ActionInput_notion_appendbulletedlist {
  block_id: string;
  children: any[];
};

export interface ActionOutput_notion_appendbulletedlist {
  object: string;
  results: any[];
};

export interface ActionInput_notion_appendcalloutblock {
  block_id: string;
  children: any[];
};

export interface ActionOutput_notion_appendcalloutblock {
  object: string;
  results: any[];
};

export interface ActionInput_notion_appendcodeblock {
  block_id: string;
  children: any[];
};

export interface ActionOutput_notion_appendcodeblock {
  object: string;
  results: any[];
};

export interface ActionInput_notion_appenddivider {
  block_id: string;
  children: any[];
};

export interface ActionOutput_notion_appenddivider {
  object: string;
  results: any[];
};

export interface ActionInput_notion_appendheadingblock {
  block_id: string;
  children: any[];
};

export interface ActionOutput_notion_appendheadingblock {
  object: string;
  results: any[];
};

export interface ActionInput_notion_appendtodoblock {
  block_id: string;
  children: any[];
};

export interface ActionOutput_notion_appendtodoblock {
  object: string;
  results: any[];
};

export interface ActionInput_notion_archivepage {
  page_id: string;
};

export interface ActionOutput_notion_archivepage {
  id: string;
  object: string;
  archived: boolean;
};

export interface ActionInput_notion_createcomment {
  parent: {  page_id: string;};
  rich_text: any[];
  discussion_id?: string | undefined;
};

export interface ActionOutput_notion_createcomment {
  id: string;
  object: string;
  created_time: string;
  rich_text: any[];
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

export interface ActionInput_notion_createdatabase {
  parent: {  page_id: string;};
  title: ({  text: {  content: string;};})[];
  properties: {  [key: string]: any | undefined;};
};

export interface ActionOutput_notion_createdatabase {
  id: string;
  object: string;
  created_time: string;
  title: any[];
  properties: {  [key: string]: any | undefined;};
};

export interface ActionInput_notion_createpage {
  parent: {  page_id?: string | undefined;
  database_id?: string | undefined;};
  properties: {  [key: string]: any | undefined;};
  children?: any[] | undefined;
  icon?: {  type?: string | undefined;
  emoji?: string | undefined;
  external?: {  url: string;} | undefined;};
  cover?: {  type?: string | undefined;
  external?: {  url: string;} | undefined;};
};

export interface ActionOutput_notion_createpage {
  id: string;
  object: string;
  created_time: string;
  last_edited_time: string;
  created_by: {  object: string;
  id: string;};
  last_edited_by: {  object: string;
  id: string;};
  parent: {  type: string;
  page_id: string | null;
  database_id: string | null;};
  archived: boolean;
  in_trash: boolean;
  properties: {  [key: string]: any | undefined;};
  url: string;
  public_url: string | null;
};

export interface ActionInput_notion_deleteblock {
  block_id: string;
};

export interface ActionOutput_notion_deleteblock {
  id: string;
  object: string;
  archived: boolean;
};

export interface ActionInput_notion_duplicatepage {
  parent: {  page_id?: string | undefined;
  database_id?: string | undefined;};
  properties: {  [key: string]: any | undefined;};
  children?: any[] | undefined;
};

export interface ActionOutput_notion_duplicatepage {
  id: string;
  object: string;
  created_time: string;
  parent: {  type: string;
  page_id: string | null;
  database_id: string | null;};
  properties: {  [key: string]: any | undefined;};
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

export interface ActionInput_notion_getbotuser {
};

export interface ActionOutput_notion_getbotuser {
  id: string;
  object: string;
  type: string;
  name: string;
  bot?: any | undefined;
};

export interface ActionInput_notion_listcomments {
  block_id: string;
  page_size?: number | undefined;
  cursor?: string | undefined;
};

export interface ActionOutput_notion_listcomments {
  object: string;
  results: any[];
  has_more: boolean;
  next_cursor: string | null;
};

export interface ActionInput_notion_listusers {
  page_size?: number | undefined;
  cursor?: string | undefined;
};

export interface ActionOutput_notion_listusers {
  object: string;
  results: any[];
  has_more: boolean;
  next_cursor: string | null;
};

export interface ActionInput_notion_querydatabasefiltered {
  database_id: string;
  filter?: any | undefined;
  page_size?: number | undefined;
  cursor?: string | undefined;
};

export interface ActionOutput_notion_querydatabasefiltered {
  object: string;
  results: any[];
  has_more: boolean;
  next_cursor: string | null;
};

export interface ActionInput_notion_querydatabasesorted {
  database_id: string;
  sorts: any[];
  page_size?: number | undefined;
  cursor?: string | undefined;
};

export interface ActionOutput_notion_querydatabasesorted {
  object: string;
  results: any[];
  has_more: boolean;
  next_cursor: string | null;
};

export interface ActionInput_notion_querydatabase {
  database_id: string;
  filter?: any | undefined;
  sorts?: any[] | undefined;
  page_size?: number | undefined;
  cursor?: string | undefined;
};

export interface ActionOutput_notion_querydatabase {
  object: string;
  results: any[];
  has_more: boolean;
  next_cursor: string | null;
};

export interface ActionInput_notion_restorepage {
  page_id: string;
};

export interface ActionOutput_notion_restorepage {
  id: string;
  object: string;
  archived: boolean;
};

export interface ActionInput_notion_retrieveblockchildren {
  block_id: string;
  page_size?: number | undefined;
  cursor?: string | undefined;
};

export interface ActionOutput_notion_retrieveblockchildren {
  object: string;
  results: any[];
  has_more: boolean;
  next_cursor: string | null;
};

export interface ActionInput_notion_retrieveblock {
  block_id: string;
};

export interface ActionOutput_notion_retrieveblock {
  id: string;
  object: string;
  type: string;
  has_children: boolean;
  created_time: string;
};

export interface ActionInput_notion_retrievedatabase {
  database_id: string;
};

export interface ActionOutput_notion_retrievedatabase {
  id: string;
  object: string;
  created_time: string;
  last_edited_time: string;
  title: any[];
  properties: {  [key: string]: any | undefined;};
};

export interface ActionInput_notion_retrievepageproperty {
  page_id: string;
  property_id: string;
};

export interface ActionOutput_notion_retrievepageproperty {
  object: string;
  type: string;
  results?: any[] | undefined;
  property_item?: any | undefined;
};

export interface ActionInput_notion_retrievepage {
  page_id: string;
};

export interface ActionOutput_notion_retrievepage {
  id: string;
  object: string;
  created_time: string;
  last_edited_time: string;
  created_by: {  object: string;
  id: string;};
  last_edited_by: {  object: string;
  id: string;};
  parent: {  type: string;
  page_id: string | null;
  database_id: string | null;
  workspace: boolean | null;};
  archived: boolean;
  in_trash: boolean;
  properties: {  [key: string]: any | undefined;};
  url: string;
  public_url: string | null;
};

export interface ActionInput_notion_retrieveuser {
  user_id: string;
};

export interface ActionOutput_notion_retrieveuser {
  id: string;
  object: string;
  type: string;
  name: string;
  avatar_url: string | null;
};

export interface ActionInput_notion_searchdatabases {
  query?: string | undefined;
  page_size?: number | undefined;
  cursor?: string | undefined;
};

export interface ActionOutput_notion_searchdatabases {
  object: string;
  results: any[];
  has_more: boolean;
  next_cursor: string | null;
};

export interface ActionInput_notion_searchpages {
  query?: string | undefined;
  page_size?: number | undefined;
  cursor?: string | undefined;
};

export interface ActionOutput_notion_searchpages {
  object: string;
  results: any[];
  has_more: boolean;
  next_cursor: string | null;
};

export interface ActionInput_notion_search {
  query?: string | undefined;
  filter?: {  property: string;
  value: string;} | undefined;
  sort?: {  direction: string;
  timestamp: string;} | undefined;
  page_size?: number | undefined;
  cursor?: string | undefined;
};

export interface ActionOutput_notion_search {
  object: string;
  results: any[];
  has_more: boolean;
  next_cursor: string | null;
};

export interface ActionInput_notion_updateblock {
  block_id: string;
  paragraph?: any | undefined;
  heading_1?: any | undefined;
  heading_2?: any | undefined;
  heading_3?: any | undefined;
  bulleted_list_item?: any | undefined;
  numbered_list_item?: any | undefined;
  to_do?: any | undefined;
  toggle?: any | undefined;
  code?: any | undefined;
  callout?: any | undefined;
  quote?: any | undefined;
};

export interface ActionOutput_notion_updateblock {
  id: string;
  object: string;
  type: string;
  has_children: boolean;
};

export interface ActionInput_notion_updatedatabase {
  database_id: string;
  title?: ({  text: {  content: string;};})[] | undefined;
  description?: any[] | undefined;
  properties?: {  [key: string]: any | undefined;};
};

export interface ActionOutput_notion_updatedatabase {
  id: string;
  object: string;
  title: any[];
  properties: {  [key: string]: any | undefined;};
};

export interface ActionInput_notion_updatepage {
  page_id: string;
  properties?: {  [key: string]: any | undefined;};
  icon?: {  type?: string | undefined;
  emoji?: string | undefined;
  external?: {  url: string;} | undefined;};
  cover?: {  type?: string | undefined;
  external?: {  url: string;} | undefined;};
  archived?: boolean | undefined;
};

export interface ActionOutput_notion_updatepage {
  id: string;
  object: string;
  created_time: string;
  last_edited_time: string;
  created_by: {  object: string;
  id: string;};
  last_edited_by: {  object: string;
  id: string;};
  parent: {  type: string;
  page_id: string | null;
  database_id: string | null;
  workspace: boolean | null;};
  archived: boolean;
  in_trash: boolean;
  properties: {  [key: string]: any | undefined;};
  url: string;
  public_url: string | null;
};
