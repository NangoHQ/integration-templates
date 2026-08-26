import { createSync } from 'nango';
import { z } from 'zod';

// https://learn.microsoft.com/onedrive/developer/rest-api/resources/driveitem
const UserFileSelectionSchema = z.object({
    id: z.string(),
    fileId: z.string(),
    name: z.string().optional(),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    downloadUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional()
});

// Metadata schema for selected files
const PickedFileSchema = z.object({
    fileId: z.string()
});

const MetadataSchema = z.object({
    drives: z.array(z.object({ id: z.string() })).optional(),
    pickedFiles: z.array(PickedFileSchema).optional()
});

// OneDrive DriveItem response schema
const DriveItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    content: z
        .object({
            downloadUrl: z.string().optional()
        })
        .optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional()
});

const CheckpointSchema = z.object({
    offset: z.number().int().nonnegative(),
    pickedFilesFingerprint: z.string()
});

const sync = createSync({
    description: 'Sync selected OneDrive files from metadata',
    version: '2.1.0',
    frequency: 'every 5 minutes',
    autoStart: false,
    checkpoint: CheckpointSchema,
    models: {
        UserFileSelection: UserFileSelectionSchema
    },

    exec: async (nango) => {
        const checkpointResult = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const checkpoint = checkpointResult.success ? checkpointResult.data : undefined;

        // Fetch and validate metadata
        const rawMetadata = await nango.getMetadata();
        const metadataParse = MetadataSchema.safeParse(rawMetadata);
        if (!metadataParse.success) {
            throw new Error(`Invalid metadata: ${metadataParse.error.message}`);
        }
        const metadata = metadataParse.data;

        const pickedFiles = metadata.pickedFiles ?? [];
        const pickedFilesFingerprint = JSON.stringify(pickedFiles.map(({ fileId }) => fileId));
        const offset = checkpoint?.pickedFilesFingerprint === pickedFilesFingerprint ? checkpoint.offset : 0;

        // Safe to call every execution: trackDeletesStart() will not overwrite the
        // start of a delete-tracking window this refresh already opened.
        await nango.trackDeletesStart('UserFileSelection');

        for (let i = offset; i < pickedFiles.length; i++) {
            const picked = pickedFiles[i];
            if (!picked) {
                continue;
            }

            // https://learn.microsoft.com/onedrive/developer/rest-api/api/driveitem_get
            const response = await nango.get({
                endpoint: `/v1.0/drive/items/${encodeURIComponent(picked.fileId)}`,
                params: {
                    select: 'id,name,size,webUrl,content.downloadUrl,createdDateTime,lastModifiedDateTime'
                },
                retries: 3
            });

            const parsed = DriveItemSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Invalid response: ${parsed.error.message} for file ${picked.fileId}`);
            }

            const data = parsed.data;
            if (!data.id) {
                throw new Error(`Invalid response: missing id for file ${picked.fileId}`);
            }

            const record = {
                id: data.id,
                fileId: data.id,
                ...(data.name !== undefined && { name: data.name }),
                ...(data.size !== undefined && { size: data.size }),
                ...(data.webUrl !== undefined && { webUrl: data.webUrl }),
                ...(data.content?.downloadUrl !== undefined && { downloadUrl: data.content.downloadUrl }),
                ...(data.createdDateTime !== undefined && { createdDateTime: data.createdDateTime }),
                ...(data.lastModifiedDateTime !== undefined && { lastModifiedDateTime: data.lastModifiedDateTime })
            };

            await nango.batchSave([record], 'UserFileSelection');
            await nango.saveCheckpoint({ offset: i + 1, pickedFilesFingerprint });
        }

        // Clear the checkpoint only after the last file has been saved, then close the
        // delete-tracking window opened by trackDeletesStart().
        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('UserFileSelection');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
