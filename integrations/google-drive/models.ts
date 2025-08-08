import { z } from "zod";

export const IdEntity = z.object({
  id: z.string()
});

export type IdEntity = z.infer<typeof IdEntity>;

export const DocumentMetadata = z.object({
  files: z.string().array(),
  folders: z.string().array()
});

export type DocumentMetadata = z.infer<typeof DocumentMetadata>;

export const Document = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
  mimeType: z.string(),
  updatedAt: z.string()
});

export type Document = z.infer<typeof Document>;

export const Folder = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
  mimeType: z.string(),
  updatedAt: z.string()
});

export type Folder = z.infer<typeof Folder>;

export const JSONSpreadsheet = z.object({
  spreadsheetId: z.string(),
  properties: z.object({}),
  sheets: z.object({}).array(),
  namedRanges: z.object({}).array(),
  spreadsheetUrl: z.string(),
  developerMetadata: z.object({}).array(),
  dataSources: z.object({}).array(),
  dataSourceSchedules: z.object({}).array()
});

export type JSONSpreadsheet = z.infer<typeof JSONSpreadsheet>;

export const JSONDocument = z.object({
  documentId: z.string(),
  title: z.string(),
  url: z.string(),
  tabs: z.object({}).array(),
  revisionId: z.string(),

  suggestionsViewMode: z.union([
    z.literal("DEFAULT_FOR_CURRENT_ACCESS"),
    z.literal("SUGGESTIONS_INLINE"),
    z.literal("PREVIEW_SUGGESTIONS_ACCEPTED"),
    z.literal("PREVIEW_WITHOUT_SUGGESTIONS")
  ]),

  body: z.object({}),
  headers: z.object({}),
  footers: z.object({}),
  footnotes: z.object({}),
  documentStyle: z.object({}),
  suggestedDocumentStyleChanges: z.object({}),
  namedStyles: z.object({}),
  suggestedNamedStylesChanges: z.object({}),
  lists: z.object({}),
  namedRanges: z.object({}),
  inlineObjects: z.object({}),
  positionedObjects: z.object({})
});

export type JSONDocument = z.infer<typeof JSONDocument>;

export const GoogleDocument = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  parents: z.string().optional().array(),
  modifiedTime: z.string().optional(),
  createdTime: z.string().optional(),
  webViewLink: z.string().optional(),
  kind: z.string().optional()
});

export type GoogleDocument = z.infer<typeof GoogleDocument>;

export const UploadFileInput = z.object({
  content: z.string(),
  name: z.string(),
  mimeType: z.string(),
  folderId: z.string().optional(),
  description: z.string().optional(),
  isBase64: z.boolean().optional()
});

export type UploadFileInput = z.infer<typeof UploadFileInput>;

export const FolderContentInput = z.object({
  id: z.string().optional(),
  cursor: z.string().optional()
});

export type FolderContentInput = z.infer<typeof FolderContentInput>;

export const FolderContent = z.object({
  files: GoogleDocument.array(),
  folders: GoogleDocument.array(),
  next_cursor: z.string().optional()
});

export type FolderContent = z.infer<typeof FolderContent>;

export const DriveCapabilities = z.object({
  canAddChildren: z.boolean(),
  canComment: z.boolean(),
  canCopy: z.boolean(),
  canDeleteDrive: z.boolean(),
  canDownload: z.boolean(),
  canEdit: z.boolean(),
  canListChildren: z.boolean(),
  canManageMembers: z.boolean(),
  canReadRevisions: z.boolean(),
  canRename: z.boolean(),
  canShare: z.boolean(),
  canTrashChildren: z.boolean(),
  canRenameDrive: z.boolean(),
  canChangeDriveBackground: z.boolean(),
  canChangeCopyRequiresWriterPermissionRestriction: z.boolean(),
  canChangeDomainUsersOnlyRestriction: z.boolean(),
  canChangeDriveMembersOnlyRestriction: z.boolean(),
  canChangeSharingFoldersRequiresOrganizerPermissionRestriction: z.boolean(),
  canResetDriveRestrictions: z.boolean(),
  canDeleteChildren: z.boolean()
});

export type DriveCapabilities = z.infer<typeof DriveCapabilities>;

export const DriveRestrictions = z.object({
  adminManagedRestrictions: z.boolean(),
  copyRequiresWriterPermission: z.boolean(),
  domainUsersOnly: z.boolean(),
  driveMembersOnly: z.boolean(),
  sharingFoldersRequiresPublisherPermission: z.boolean(),
  sharingFoldersRequiresOrganizerPermission: z.boolean()
});

export type DriveRestrictions = z.infer<typeof DriveRestrictions>;

export const Drive = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
  createdTime: z.string(),
  hidden: z.boolean(),
  capabilities: DriveCapabilities,
  restrictions: DriveRestrictions
});

export type Drive = z.infer<typeof Drive>;

export const ListDrivesInput = z.object({
  cursor: z.string()
});

export type ListDrivesInput = z.infer<typeof ListDrivesInput>;

export const DriveListResponse = z.object({
  drives: Drive.array(),
  next_cursor: z.string(),
  kind: z.string()
});

export type DriveListResponse = z.infer<typeof DriveListResponse>;
export const Anonymous_googledrive_action_fetchdocument_output = z.string();
export type Anonymous_googledrive_action_fetchdocument_output = z.infer<typeof Anonymous_googledrive_action_fetchdocument_output>;

export const models = {
  IdEntity: IdEntity,
  DocumentMetadata: DocumentMetadata,
  Document: Document,
  Folder: Folder,
  JSONSpreadsheet: JSONSpreadsheet,
  JSONDocument: JSONDocument,
  GoogleDocument: GoogleDocument,
  UploadFileInput: UploadFileInput,
  FolderContentInput: FolderContentInput,
  FolderContent: FolderContent,
  DriveCapabilities: DriveCapabilities,
  DriveRestrictions: DriveRestrictions,
  Drive: Drive,
  ListDrivesInput: ListDrivesInput,
  DriveListResponse: DriveListResponse,
  Anonymous_googledrive_action_fetchdocument_output: Anonymous_googledrive_action_fetchdocument_output
};