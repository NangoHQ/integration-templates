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
  /**
   * The ID of the block or page to append to. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"
   */
  block_id: string;
  /**
   * Array of block objects to append (max 100).
   */
  children: any[];
  /**
   * Block ID to insert after.
   */
  after?: string | undefined;
};

export interface ActionOutput_notion_appendblockchildren {
  object: string;
  results: any[];
};

export interface ActionInput_notion_appendbulletedlist {
  /**
   * The ID of the block or page to append to. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"
   */
  block_id: string;
  /**
   * Array of bulleted list item blocks.
   */
  children: any[];
};

export interface ActionOutput_notion_appendbulletedlist {
  object: string;
  results: any[];
};

export interface ActionInput_notion_appendcalloutblock {
  /**
   * The ID of the block or page to append to. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"
   */
  block_id: string;
  /**
   * Array of callout block objects.
   */
  children: any[];
};

export interface ActionOutput_notion_appendcalloutblock {
  object: string;
  results: any[];
};

export interface ActionInput_notion_appendcodeblock {
  /**
   * The ID of the block or page to append to. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"
   */
  block_id: string;
  /**
   * Array of code block objects.
   */
  children: any[];
};

export interface ActionOutput_notion_appendcodeblock {
  object: string;
  results: any[];
};

export interface ActionInput_notion_appenddivider {
  /**
   * The ID of the block or page to append to. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"
   */
  block_id: string;
  /**
   * Array containing divider block. Example: [{"divider":{}}]
   */
  children: any[];
};

export interface ActionOutput_notion_appenddivider {
  object: string;
  results: any[];
};

export interface ActionInput_notion_appendheadingblock {
  /**
   * The ID of the block or page to append to. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"
   */
  block_id: string;
  /**
   * Array of heading block objects. Example: [{"heading_2":{"rich_text":[{"text":{"content":"Section Title"}}]}}]
   */
  children: any[];
};

export interface ActionOutput_notion_appendheadingblock {
  object: string;
  results: any[];
};

export interface ActionInput_notion_appendtodoblock {
  /**
   * The ID of the block or page to append to. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"
   */
  block_id: string;
  /**
   * Array of to-do block objects.
   */
  children: any[];
};

export interface ActionOutput_notion_appendtodoblock {
  object: string;
  results: any[];
};

export interface ActionInput_notion_archivepage {
  /**
   * The ID of the page to archive. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"
   */
  page_id: string;
};

export interface ActionOutput_notion_archivepage {
  id: string;
  object: string;
  archived: boolean;
};

export interface ActionInput_notion_createcomment {
  /**
   * Parent page for the comment.
   */
  parent: {  /**
   * Page ID to add comment to. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"
   */
  page_id: string;};
  /**
   * Comment content as rich text array.
   */
  rich_text: any[];
  /**
   * Discussion thread ID to reply to.
   */
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
  /**
   * Parent page where database will be created.
   */
  parent: {  /**
   * Parent page ID. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"
   */
  page_id: string;};
  /**
   * Database title as rich text array.
   */
  title: ({  text: {  content: string;};})[];
  /**
   * Database property schema. Example: {"Name":{"title":{}},"Description":{"rich_text":{}}}
   */
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
  /**
   * Parent page or database. Must include either page_id or database_id.
   */
  parent: {  /**
   * Parent page ID. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"
   */
  page_id?: string | undefined;
  /**
   * Parent database ID. Example: "2b6ce298-3121-8079-a497-d3eca16d875c"
   */
  database_id?: string | undefined;};
  /**
   * Page properties. For pages with page parent, use title property. For database parents, use database property schema.
   */
  properties: {  [key: string]: any | undefined;};
  /**
   * Array of block objects to add as page content.
   */
  children?: any[] | undefined;
  /**
   * Page icon as emoji or external URL.
   */
  icon?: {  type?: string | undefined;
  emoji?: string | undefined;
  external?: {  url: string;} | undefined;};
  /**
   * Page cover image as external URL.
   */
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
  /**
   * The ID of the block to delete. Example: "2b6ce298-3121-8087-914a-d4fe743f6d69"
   */
  block_id: string;
};

export interface ActionOutput_notion_deleteblock {
  id: string;
  object: string;
  archived: boolean;
};

export interface ActionInput_notion_duplicatepage {
  /**
   * Parent page or database for the duplicate.
   */
  parent: {  /**
   * Parent page ID. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"
   */
  page_id?: string | undefined;
  /**
   * Parent database ID.
   */
  database_id?: string | undefined;};
  /**
   * Page properties for the duplicate.
   */
  properties: {  [key: string]: any | undefined;};
  /**
   * Content blocks to include in the duplicate.
   */
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
  /**
   * The ID of the page or block. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"
   */
  block_id: string;
  /**
   * Number of results to return (max 100).
   */
  page_size?: number | undefined;
  /**
   * Pagination cursor from previous response.
   */
  cursor?: string | undefined;
};

export interface ActionOutput_notion_listcomments {
  object: string;
  results: any[];
  has_more: boolean;
  next_cursor: string | null;
};

export interface ActionInput_notion_listusers {
  /**
   * Number of results to return (max 100).
   */
  page_size?: number | undefined;
  /**
   * Pagination cursor from previous response.
   */
  cursor?: string | undefined;
};

export interface ActionOutput_notion_listusers {
  object: string;
  results: any[];
  has_more: boolean;
  next_cursor: string | null;
};

export interface ActionInput_notion_querydatabasefiltered {
  /**
   * The ID of the database to query. Example: "2b6ce298-3121-8079-a497-d3eca16d875c"
   */
  database_id: string;
  /**
   * Filter conditions. Example: {"property":"Name","title":{"contains":"test"}}
   */
  filter?: any | undefined;
  /**
   * Number of results to return (max 100).
   */
  page_size?: number | undefined;
  /**
   * Pagination cursor from previous response.
   */
  cursor?: string | undefined;
};

export interface ActionOutput_notion_querydatabasefiltered {
  object: string;
  results: any[];
  has_more: boolean;
  next_cursor: string | null;
};

export interface ActionInput_notion_querydatabasesorted {
  /**
   * The ID of the database to query. Example: "2b6ce298-3121-8079-a497-d3eca16d875c"
   */
  database_id: string;
  /**
   * Sort criteria. Example: [{"property":"Name","direction":"ascending"}]
   */
  sorts: any[];
  /**
   * Number of results to return (max 100).
   */
  page_size?: number | undefined;
  /**
   * Pagination cursor from previous response.
   */
  cursor?: string | undefined;
};

export interface ActionOutput_notion_querydatabasesorted {
  object: string;
  results: any[];
  has_more: boolean;
  next_cursor: string | null;
};

export interface ActionInput_notion_querydatabase {
  /**
   * The ID of the database to query. Example: "2b6ce298-3121-8079-a497-d3eca16d875c"
   */
  database_id: string;
  /**
   * Filter conditions for the query.
   */
  filter?: any | undefined;
  /**
   * Sort criteria for the results.
   */
  sorts?: any[] | undefined;
  /**
   * Number of results to return (max 100).
   */
  page_size?: number | undefined;
  /**
   * Pagination cursor from previous response.
   */
  cursor?: string | undefined;
};

export interface ActionOutput_notion_querydatabase {
  object: string;
  results: any[];
  has_more: boolean;
  next_cursor: string | null;
};

export interface ActionInput_notion_restorepage {
  /**
   * The ID of the page to restore. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"
   */
  page_id: string;
};

export interface ActionOutput_notion_restorepage {
  id: string;
  object: string;
  archived: boolean;
};

export interface ActionInput_notion_retrieveblockchildren {
  /**
   * The ID of the block or page. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"
   */
  block_id: string;
  /**
   * Number of results to return (max 100).
   */
  page_size?: number | undefined;
  /**
   * Pagination cursor from previous response.
   */
  cursor?: string | undefined;
};

export interface ActionOutput_notion_retrieveblockchildren {
  object: string;
  results: any[];
  has_more: boolean;
  next_cursor: string | null;
};

export interface ActionInput_notion_retrieveblock {
  /**
   * The ID of the block to retrieve. Example: "2b6ce298-3121-8087-914a-d4fe743f6d69"
   */
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
  /**
   * The ID of the database to retrieve. Example: "2b6ce298-3121-8079-a497-d3eca16d875c"
   */
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
  /**
   * The ID of the page. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"
   */
  page_id: string;
  /**
   * The ID or name of the property to retrieve. Example: "title"
   */
  property_id: string;
};

export interface ActionOutput_notion_retrievepageproperty {
  object: string;
  type: string;
  results?: any[] | undefined;
  property_item?: any | undefined;
};

export interface ActionInput_notion_retrievepage {
  /**
   * The ID of the page to retrieve. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"
   */
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
  /**
   * The ID of the user to retrieve. Example: "d42542a8-a81c-4386-aa95-313aa4e818b3"
   */
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
  /**
   * Text to search for in database titles.
   */
  query?: string | undefined;
  /**
   * Number of results to return (max 100).
   */
  page_size?: number | undefined;
  /**
   * Pagination cursor from previous response.
   */
  cursor?: string | undefined;
};

export interface ActionOutput_notion_searchdatabases {
  object: string;
  results: any[];
  has_more: boolean;
  next_cursor: string | null;
};

export interface ActionInput_notion_searchpages {
  /**
   * Text to search for in page titles.
   */
  query?: string | undefined;
  /**
   * Number of results to return (max 100).
   */
  page_size?: number | undefined;
  /**
   * Pagination cursor from previous response.
   */
  cursor?: string | undefined;
};

export interface ActionOutput_notion_searchpages {
  object: string;
  results: any[];
  has_more: boolean;
  next_cursor: string | null;
};

export interface ActionInput_notion_search {
  /**
   * Text to search for in page/database titles.
   */
  query?: string | undefined;
  /**
   * Filter to search only pages or databases. Example: {"property":"object","value":"page"}
   */
  filter?: {  property: string;
  value: string;} | undefined;
  /**
   * Sort order. Example: {"direction":"descending","timestamp":"last_edited_time"}
   */
  sort?: {  direction: string;
  timestamp: string;} | undefined;
  /**
   * Number of results to return (max 100).
   */
  page_size?: number | undefined;
  /**
   * Pagination cursor from previous response.
   */
  cursor?: string | undefined;
};

export interface ActionOutput_notion_search {
  object: string;
  results: any[];
  has_more: boolean;
  next_cursor: string | null;
};

export interface ActionInput_notion_updateblock {
  /**
   * The ID of the block to update. Example: "2b6ce298-3121-8087-914a-d4fe743f6d69"
   */
  block_id: string;
  /**
   * Paragraph block content.
   */
  paragraph?: any | undefined;
  /**
   * Heading 1 block content.
   */
  heading_1?: any | undefined;
  /**
   * Heading 2 block content.
   */
  heading_2?: any | undefined;
  /**
   * Heading 3 block content.
   */
  heading_3?: any | undefined;
  /**
   * Bulleted list item content.
   */
  bulleted_list_item?: any | undefined;
  /**
   * Numbered list item content.
   */
  numbered_list_item?: any | undefined;
  /**
   * To-do block content.
   */
  to_do?: any | undefined;
  /**
   * Toggle block content.
   */
  toggle?: any | undefined;
  /**
   * Code block content.
   */
  code?: any | undefined;
  /**
   * Callout block content.
   */
  callout?: any | undefined;
  /**
   * Quote block content.
   */
  quote?: any | undefined;
};

export interface ActionOutput_notion_updateblock {
  id: string;
  object: string;
  type: string;
  has_children: boolean;
};

export interface ActionInput_notion_updatedatabase {
  /**
   * The ID of the database to update. Example: "2b6ce298-3121-8079-a497-d3eca16d875c"
   */
  database_id: string;
  /**
   * New database title as rich text array.
   */
  title?: ({  text: {  content: string;};})[] | undefined;
  /**
   * Database description as rich text array.
   */
  description?: any[] | undefined;
  /**
   * Property schema updates.
   */
  properties?: {  [key: string]: any | undefined;};
};

export interface ActionOutput_notion_updatedatabase {
  id: string;
  object: string;
  title: any[];
  properties: {  [key: string]: any | undefined;};
};

export interface ActionInput_notion_updatepage {
  /**
   * The ID of the page to update. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"
   */
  page_id: string;
  /**
   * Page properties to update.
   */
  properties?: {  [key: string]: any | undefined;};
  /**
   * Page icon as emoji or external URL.
   */
  icon?: {  type?: string | undefined;
  emoji?: string | undefined;
  external?: {  url: string;} | undefined;};
  /**
   * Page cover image as external URL.
   */
  cover?: {  type?: string | undefined;
  external?: {  url: string;} | undefined;};
  /**
   * Set to true to archive the page.
   */
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
