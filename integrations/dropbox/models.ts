import { z } from "zod";

export const SuccessResponse = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponse>;

export const IdEntity = z.object({
  id: z.string()
});

export type IdEntity = z.infer<typeof IdEntity>;

export const User = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string()
});

export type User = z.infer<typeof User>;

export const CreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string()
});

export type CreateUser = z.infer<typeof CreateUser>;

export const DocumentMetadata = z.object({
  files: z.string().array(),
  folders: z.string().array()
});

export type DocumentMetadata = z.infer<typeof DocumentMetadata>;

export const Document = z.object({
  id: z.string(),
  path: z.string(),
  title: z.string(),
  modified_date: z.string()
});

export type Document = z.infer<typeof Document>;

export const FolderContentInput = z.object({
  path: z.string().optional(),
  cursor: z.string().optional()
});

export type FolderContentInput = z.infer<typeof FolderContentInput>;

export const FolderContent = z.object({
  files: Document.array(),
  folders: Document.array(),
  next_cursor: z.string().optional()
});

export type FolderContent = z.infer<typeof FolderContent>;
export const Anonymous_dropbox_action_fetchfile_output = z.string();
export type Anonymous_dropbox_action_fetchfile_output = z.infer<typeof Anonymous_dropbox_action_fetchfile_output>;
export const Anonymous_dropbox_action_fetchfile_input = z.string();
export type Anonymous_dropbox_action_fetchfile_input = z.infer<typeof Anonymous_dropbox_action_fetchfile_input>;

export const models = {
  SuccessResponse: SuccessResponse,
  IdEntity: IdEntity,
  User: User,
  CreateUser: CreateUser,
  DocumentMetadata: DocumentMetadata,
  Document: Document,
  FolderContentInput: FolderContentInput,
  FolderContent: FolderContent,
  Anonymous_dropbox_action_fetchfile_output: Anonymous_dropbox_action_fetchfile_output,
  Anonymous_dropbox_action_fetchfile_input: Anonymous_dropbox_action_fetchfile_input
};