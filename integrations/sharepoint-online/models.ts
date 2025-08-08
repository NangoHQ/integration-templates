import { z } from "zod";

export const FileMetadata = z.object({
  siteId: z.string(),
  id: z.string(),
  name: z.string(),
  etag: z.string(),
  cTag: z.string(),
  is_folder: z.boolean(),
  mime_type: z.union([z.string(), z.null()]),
  path: z.string(),
  raw_source: z.any(),
  updated_at: z.string(),
  download_url: z.union([z.string(), z.null()]),
  created_at: z.string(),
  blob_size: z.number()
});

export type FileMetadata = z.infer<typeof FileMetadata>;

export const UserFileMetadata = z.object({
  siteId: z.string(),
  id: z.string(),
  name: z.string(),
  etag: z.string(),
  cTag: z.string(),
  is_folder: z.boolean(),
  mime_type: z.union([z.string(), z.null()]),
  path: z.string(),
  raw_source: z.object({}),
  updated_at: z.string(),
  download_url: z.union([z.string(), z.null()]),
  created_at: z.string(),
  blob_size: z.number()
});

export type UserFileMetadata = z.infer<typeof UserFileMetadata>;

export const SelectedUserFileMetadata = z.object({
  siteId: z.string(),
  id: z.string(),
  name: z.string(),
  etag: z.string(),
  cTag: z.string(),
  is_folder: z.boolean(),
  mime_type: z.union([z.string(), z.null()]),
  path: z.string(),
  raw_source: z.object({}),
  updated_at: z.string(),
  download_url: z.union([z.string(), z.null()]),
  created_at: z.string(),
  blob_size: z.number()
});

export type SelectedUserFileMetadata = z.infer<typeof SelectedUserFileMetadata>;

export const Site = z.object({
  id: z.string(),
  name: z.string(),
  createdDateTime: z.string(),
  webUrl: z.string()
});

export type Site = z.infer<typeof Site>;

export const PickedFile = z.object({
  siteId: z.string(),
  fileIds: z.string().array()
});

export type PickedFile = z.infer<typeof PickedFile>;

export const SharepointMetadata = z.object({
  sharedSites: z.string().array(),
  pickedFiles: PickedFile.array()
});

export type SharepointMetadata = z.infer<typeof SharepointMetadata>;

export const SharepointSites = z.object({
  sitesToSync: Site.array()
});

export type SharepointSites = z.infer<typeof SharepointSites>;

export const FetchFileInput = z.object({
  siteId: z.string(),
  itemId: z.string()
});

export type FetchFileInput = z.infer<typeof FetchFileInput>;

export const FetchFile = z.object({
  id: z.string(),
  download_url: z.union([z.string(), z.null()])
});

export type FetchFile = z.infer<typeof FetchFile>;

export const models = {
  FileMetadata: FileMetadata,
  UserFileMetadata: UserFileMetadata,
  SelectedUserFileMetadata: SelectedUserFileMetadata,
  Site: Site,
  PickedFile: PickedFile,
  SharepointMetadata: SharepointMetadata,
  SharepointSites: SharepointSites,
  FetchFileInput: FetchFileInput,
  FetchFile: FetchFile
};
