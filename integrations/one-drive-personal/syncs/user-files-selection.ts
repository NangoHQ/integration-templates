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

const sync = createSync({
    description: 'Sync selected OneDrive files from metadata',
    version: '2.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    models: {
        UserFileSelection: UserFileSelectionSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/user-files-selection'
        }
    ],

    exec: async (nango) => {
        // Track deletes for full refresh pattern - must be called first
        await nango.trackDeletesStart('UserFileSelection');

        // @allowTryCatch
        try {
            // Fetch and validate metadata
            const rawMetadata = await nango.getMetadata();
            const metadataParse = MetadataSchema.safeParse(rawMetadata);
            if (!metadataParse.success) {
                throw new Error(`Invalid metadata: ${metadataParse.error.message}`);
            }
            const metadata = metadataParse.data;

            const results: Array<{
                id: string;
                fileId: string;
                name?: string;
                size?: number;
                webUrl?: string;
                downloadUrl?: string;
                createdDateTime?: string;
                lastModifiedDateTime?: string;
            }> = [];

            if (metadata.pickedFiles && metadata.pickedFiles.length > 0) {
                for (const picked of metadata.pickedFiles) {
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

                    results.push({
                        id: data.id,
                        fileId: data.id,
                        ...(data.name !== undefined && { name: data.name }),
                        ...(data.size !== undefined && { size: data.size }),
                        ...(data.webUrl !== undefined && { webUrl: data.webUrl }),
                        ...(data.content?.downloadUrl !== undefined && { downloadUrl: data.content.downloadUrl }),
                        ...(data.createdDateTime !== undefined && { createdDateTime: data.createdDateTime }),
                        ...(data.lastModifiedDateTime !== undefined && { lastModifiedDateTime: data.lastModifiedDateTime })
                    });
                }
            }

            if (results.length > 0) {
                await nango.batchSave(results, 'UserFileSelection');
            }
        } finally {
            await nango.trackDeletesEnd('UserFileSelection');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
