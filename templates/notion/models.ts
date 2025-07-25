import { z } from "zod";

export const SuccessResponse = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponse>;

export const Property = z.object({
  propertyKey: z.string(),
  notionValue: z.any()
});

export type Property = z.infer<typeof Property>;

export const CreateDatabaseRowOutput = z.object({
  success: z.boolean(),
  addedProperties: Property.array()
});

export type CreateDatabaseRowOutput = z.infer<typeof CreateDatabaseRowOutput>;

export const RichPageInput = z.object({
  pageId: z.string()
});

export type RichPageInput = z.infer<typeof RichPageInput>;

export const ContentMetadata = z.object({
  id: z.string(),
  path: z.string().optional(),
  type: z.union([z.literal("page"), z.literal("database")]),
  last_modified: z.string(),
  title: z.string().optional(),
  parent_id: z.string().optional()
});

export type ContentMetadata = z.infer<typeof ContentMetadata>;

export const RichPage = z.object({
  id: z.string(),
  path: z.string(),
  title: z.string(),
  content: z.string(),
  contentType: z.string(),
  meta: z.object({}).catchall(z.any()),
  last_modified: z.string(),
  parent_id: z.string().optional()
});

export type RichPage = z.infer<typeof RichPage>;

export const DatabaseInput = z.object({
  databaseId: z.string()
});

export type DatabaseInput = z.infer<typeof DatabaseInput>;

export const CreateDatabaseRowInput = z.object({
  databaseId: z.string(),
  properties: z.object({})
});

export type CreateDatabaseRowInput = z.infer<typeof CreateDatabaseRowInput>;

export const RowEntry = z.object({
  id: z.string(),
  row: z.object({}).catchall(z.any())
});

export type RowEntry = z.infer<typeof RowEntry>;

export const Database = z.object({
  id: z.string(),
  path: z.string(),
  title: z.string(),
  meta: z.object({}).catchall(z.any()),
  last_modified: z.string(),
  entries: RowEntry.array()
});

export type Database = z.infer<typeof Database>;

export const NotionCompleteDatabase = z.object({
  id: z.string(),
  row: z.object({}).catchall(z.any()),

  meta: z.object({
    databaseId: z.string(),
    path: z.string(),
    title: z.string(),
    last_modified: z.string()
  })
});

export type NotionCompleteDatabase = z.infer<typeof NotionCompleteDatabase>;

export const UrlOrId = z.object({
  url: z.string().optional(),
  id: z.string().optional()
});

export type UrlOrId = z.infer<typeof UrlOrId>;

export const User = z.object({
  id: z.string(),
  email: z.union([z.string(), z.null()]),
  firstName: z.string(),
  lastName: z.string(),
  isBot: z.boolean()
});

export type User = z.infer<typeof User>;

export const models = {
  SuccessResponse: SuccessResponse,
  Property: Property,
  CreateDatabaseRowOutput: CreateDatabaseRowOutput,
  RichPageInput: RichPageInput,
  ContentMetadata: ContentMetadata,
  RichPage: RichPage,
  DatabaseInput: DatabaseInput,
  CreateDatabaseRowInput: CreateDatabaseRowInput,
  RowEntry: RowEntry,
  Database: Database,
  NotionCompleteDatabase: NotionCompleteDatabase,
  UrlOrId: UrlOrId,
  User: User
};
