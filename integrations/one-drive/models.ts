import { z } from "zod";

export const OneDriveFile = z.object({
  id: z.string(),
  name: z.string(),
  etag: z.string(),
  cTag: z.string(),
  is_folder: z.boolean(),
  mime_type: z.union([z.string(), z.null()]),
  path: z.string(),
  raw_source: z.object({}),
  updated_at: z.string(),
  created_at: z.string(),
  blob_size: z.number(),
  drive_id: z.string()
});

export type OneDriveFile = z.infer<typeof OneDriveFile>;

export const OneDriveFileSelection = z.object({
  id: z.string(),
  name: z.string(),
  etag: z.string(),
  cTag: z.string(),
  is_folder: z.boolean(),
  mime_type: z.union([z.string(), z.null()]),
  path: z.string(),
  raw_source: z.object({}),
  updated_at: z.string(),
  created_at: z.string(),
  blob_size: z.number(),
  drive_id: z.string()
});

export type OneDriveFileSelection = z.infer<typeof OneDriveFileSelection>;

export const PickedFile = z.object({
  driveId: z.string(),
  fileIds: z.string().array()
});

export type PickedFile = z.infer<typeof PickedFile>;

export const OneDriveMetadata = z.object({
  drives: z.string().array(),
  pickedFiles: PickedFile.array()
});

export type OneDriveMetadata = z.infer<typeof OneDriveMetadata>;

export const FetchFileInput = z.object({
  driveId: z.string(),
  itemId: z.string()
});

export type FetchFileInput = z.infer<typeof FetchFileInput>;

export const FetchFile = z.object({
  id: z.string(),
  download_url: z.union([z.string(), z.null()])
});

export type FetchFile = z.infer<typeof FetchFile>;

export const Drive = z.object({
  id: z.string(),
  name: z.string(),
  createdDateTime: z.string(),
  webUrl: z.string()
});

export type Drive = z.infer<typeof Drive>;

export const DriveList = z.object({
  drives: Drive.array()
});

export type DriveList = z.infer<typeof DriveList>;

export const models = {
  OneDriveFile: OneDriveFile,
  OneDriveFileSelection: OneDriveFileSelection,
  PickedFile: PickedFile,
  OneDriveMetadata: OneDriveMetadata,
  FetchFileInput: FetchFileInput,
  FetchFile: FetchFile,
  Drive: Drive,
  DriveList: DriveList
};