import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    sharedDriveIds: z.array(z.string())
});

const CheckpointSchema = z.object({
    modified_after: z.string(),
    page_token: z.string(),
    drive_index: z.number().int(),
    max_modified_time: z.string()
});

const DriveFileSchema = z.object({
    id: z.string().describe('The Drive file ID, which is also the Docs document ID'),
    name: z.string().optional(),
    mimeType: z.string().optional(),
    modifiedTime: z.string().optional()
});

const DriveFileListSchema = z.object({
    kind: z.string().optional(),
    nextPageToken: z.string().optional(),
    files: z.array(z.record(z.string(), z.unknown())).optional()
});

const DocumentResponseSchema = z.object({
    documentId: z.string().optional(),
    title: z.string().optional(),
    revisionId: z.string().optional()
});

const SharedDriveDocumentSchema = z.object({
    id: z.string(),
    documentId: z.string(),
    title: z.string().optional(),
    modifiedTime: z.string().optional(),
    document: z.record(z.string(), z.unknown()).optional()
});

const sync = createSync({
    description: 'Discover Google Docs files across shared drives and hydrate each document through the Docs API',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        SharedDriveDocument: SharedDriveDocumentSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/documents-from-shared-drives'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.parse(metadata);
        if (parsedMetadata.sharedDriveIds.length === 0) {
            throw new Error('sharedDriveIds metadata is required and must not be empty');
        }
        const sharedDriveIds = parsedMetadata.sharedDriveIds;

        const rawCheckpoint = await nango.getCheckpoint();
        let modifiedAfter = '';
        let pageToken = '';
        let driveIndex = 0;
        let maxModifiedTime = '';

        if (rawCheckpoint) {
            const checkpoint = CheckpointSchema.safeParse(rawCheckpoint);
            if (!checkpoint.success) {
                throw new Error(`Failed to parse checkpoint: ${checkpoint.error.message}`);
            }

            modifiedAfter = checkpoint.data.modified_after;
            pageToken = checkpoint.data.page_token;
            driveIndex = checkpoint.data.drive_index;
            maxModifiedTime = checkpoint.data.max_modified_time;
        }

        if (driveIndex < 0 || driveIndex >= sharedDriveIds.length) {
            driveIndex = 0;
            pageToken = '';
        }

        for (let i = driveIndex; i < sharedDriveIds.length; i++) {
            const driveId = sharedDriveIds[i];
            if (!driveId) {
                continue;
            }

            let currentPageToken = i === driveIndex ? pageToken : '';

            while (true) {
                const qParts = ["mimeType='application/vnd.google-apps.document'"];
                if (modifiedAfter) {
                    qParts.push(`modifiedTime > '${modifiedAfter}'`);
                }

                const params: Record<string, string | number> = {
                    driveId,
                    corpora: 'drive',
                    includeItemsFromAllDrives: 'true',
                    supportsAllDrives: 'true',
                    orderBy: 'modifiedTime',
                    pageSize: 100,
                    q: qParts.join(' and '),
                    fields: 'nextPageToken, files(id, name, mimeType, modifiedTime)'
                };
                if (currentPageToken) {
                    params['pageToken'] = currentPageToken;
                }

                const response = await nango.get({
                    // https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list
                    endpoint: '/files',
                    params,
                    baseUrlOverride: 'https://www.googleapis.com/drive/v3',
                    retries: 3
                });

                const parsed = DriveFileListSchema.parse(response.data);
                const files = parsed.files ?? [];

                const documents = [];
                for (const rawFile of files) {
                    const file = DriveFileSchema.parse(rawFile);

                    const docResponse = await nango.get({
                        // https://developers.google.com/docs/api/reference/rest/v1/documents/get
                        endpoint: `/v1/documents/${encodeURIComponent(file.id)}`,
                        params: {
                            includeTabsContent: 'true'
                        },
                        retries: 3
                    });

                    const doc = DocumentResponseSchema.parse(docResponse.data);
                    const rawDocument = z.record(z.string(), z.unknown()).parse(docResponse.data);

                    documents.push({
                        id: file.id,
                        documentId: file.id,
                        title: doc.title ?? file.name,
                        modifiedTime: file.modifiedTime,
                        document: rawDocument
                    });

                    if (file.modifiedTime && (!maxModifiedTime || file.modifiedTime > maxModifiedTime)) {
                        maxModifiedTime = file.modifiedTime;
                    }
                }

                if (documents.length > 0) {
                    await nango.batchSave(documents, 'SharedDriveDocument');
                }

                currentPageToken = parsed.nextPageToken ?? '';
                if (!currentPageToken) {
                    break;
                }

                await nango.saveCheckpoint({
                    modified_after: modifiedAfter,
                    page_token: currentPageToken,
                    drive_index: i,
                    max_modified_time: maxModifiedTime
                });
            }

            if (i < sharedDriveIds.length - 1) {
                await nango.saveCheckpoint({
                    modified_after: modifiedAfter,
                    page_token: '',
                    drive_index: i + 1,
                    max_modified_time: maxModifiedTime
                });
            }
        }

        modifiedAfter = maxModifiedTime || modifiedAfter;
        await nango.saveCheckpoint({
            modified_after: modifiedAfter,
            page_token: '',
            drive_index: 0,
            max_modified_time: modifiedAfter
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
