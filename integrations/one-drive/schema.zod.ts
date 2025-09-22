import { z } from 'zod';

export const oneDriveFileSchema = z.object({
    id: z.string(),
    name: z.string(),
    etag: z.string(),
    cTag: z.string(),
    is_folder: z.boolean(),
    mime_type: z.string().nullable(),
    path: z.string(),
    raw_source: z.record(z.any()),
    updated_at: z.string(),
    created_at: z.string(),
    blob_size: z.number(),
    drive_id: z.string()
});

export const fetchFileInputSchema = z.object({
    driveId: z.string(),
    itemId: z.string()
});

export const fetchFileSchema = z.object({
    id: z.string(),
    download_url: z.string().nullable()
});

export const driveSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdDateTime: z.string(),
    webUrl: z.string()
});

export const driveListSchema = z.object({
    drives: z.array(driveSchema)
});

export const pickedFileSchema = z.object({
    driveId: z.string(),
    fileIds: z.array(z.string())
});

export const oneDriveMetadataSchema = z.object({
    drives: z.array(z.string()).optional(),
    pickedFiles: z.array(pickedFileSchema)
});
