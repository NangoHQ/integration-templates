import { z } from "zod";

export const OneDriveFileSelection = z.object({
  id: z.string(),
  name: z.string(),
  etag: z.string(),
  cTag: z.string(),
  is_folder: z.boolean(),
  mime_type: z.union([z.string(), z.null()]),
  path: z.string(),
  raw_source: z.looseObject({}),
  updated_at: z.string(),
  created_at: z.string(),
  blob_size: z.number(),
  drive_id: z.string()
});

export type OneDriveFileSelection = z.infer<typeof OneDriveFileSelection>;

export const OneDriveMetadata = z.object({
  fileIds: z.string().array()
});

export type OneDriveMetadata = z.infer<typeof OneDriveMetadata>;

export const models = {
  OneDriveFileSelection: OneDriveFileSelection,
  OneDriveMetadata: OneDriveMetadata
};


