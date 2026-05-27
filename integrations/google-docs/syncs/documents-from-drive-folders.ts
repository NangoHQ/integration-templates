import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    folderIds: z.array(z.string()),
    maxResults: z.number().int().positive().optional()
});

const CheckpointSchema = z.object({
    folder_index: z.number().int(),
    page_token: z.string()
});

const DriveFileSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    mimeType: z.string().optional(),
    modifiedTime: z.string().optional(),
    createdTime: z.string().optional(),
    parents: z.array(z.string()).optional()
});

const DriveFileListSchema = z.object({
    nextPageToken: z.string().optional(),
    files: z.array(DriveFileSchema).optional()
});

const DocsDocumentSchema = z.object({
    documentId: z.string().optional(),
    title: z.string().optional(),
    body: z.record(z.string(), z.unknown()).optional(),
    revisionId: z.string().optional(),
    tabs: z.array(z.record(z.string(), z.unknown())).optional()
});

const DocumentSchema = z.object({
    id: z.string(),
    documentId: z.string(),
    title: z.string().optional(),
    revisionId: z.string().optional(),
    body: z.record(z.string(), z.unknown()).optional(),
    tabs: z.array(z.record(z.string(), z.unknown())).optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional(),
    parents: z.array(z.string()).optional(),
    mimeType: z.string().optional()
});

const sync = createSync({
    description: 'Discover Google Docs files under folder IDs from metadata, then hydrate each document through the Docs API.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'GET', path: '/syncs/documents-from-drive-folders' }],
    models: {
        FolderDocument: DocumentSchema
    },

    exec: async (nango) => {
        const parsedMetadata = MetadataSchema.safeParse(await nango.getMetadata());
        if (!parsedMetadata.success || parsedMetadata.data.folderIds.length === 0) {
            throw new Error('folderIds is required in metadata and must not be empty');
        }

        const { folderIds, maxResults } = parsedMetadata.data;
        // A capped run is intentionally partial, so only the uncapped path can
        // safely resume a full refresh and finalize deletion detection.
        const useCheckpointedFullRefresh = maxResults === undefined;

        let folderIndex = 0;
        let pageToken = '';

        if (useCheckpointedFullRefresh) {
            const rawCheckpoint = await nango.getCheckpoint();

            if (rawCheckpoint) {
                const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
                if (!parsedCheckpoint.success) {
                    throw new Error(`Failed to parse checkpoint: ${parsedCheckpoint.error.message}`);
                }

                folderIndex = parsedCheckpoint.data.folder_index;
                pageToken = parsedCheckpoint.data.page_token;
            }

            if (folderIndex < 0 || folderIndex >= folderIds.length) {
                folderIndex = 0;
                pageToken = '';
            }

            if (folderIndex === 0 && pageToken === '') {
                await nango.trackDeletesStart('FolderDocument');
            }
        }

        let completedFullRefresh = useCheckpointedFullRefresh;

        for (let i = useCheckpointedFullRefresh ? folderIndex : 0; i < folderIds.length; i++) {
            const folderId = folderIds[i];
            let processedCount = 0;
            let currentPageToken = useCheckpointedFullRefresh && i === folderIndex ? pageToken : '';

            while (true) {
                const requestPageToken = currentPageToken;

                const response = await nango.get({
                    // https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list
                    endpoint: '/drive/v3/files',
                    baseUrlOverride: 'https://www.googleapis.com',
                    params: {
                        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`,
                        fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, createdTime, parents)',
                        supportsAllDrives: 'true',
                        includeItemsFromAllDrives: 'true',
                        pageSize: 100,
                        ...(requestPageToken ? { pageToken: requestPageToken } : {})
                    },
                    retries: 3
                });

                const parsedFiles = DriveFileListSchema.safeParse(response.data);
                if (!parsedFiles.success) {
                    throw new Error(`Failed to parse Drive files: ${parsedFiles.error.message}`);
                }

                const files = parsedFiles.data.files ?? [];
                const documents: Array<z.infer<typeof DocumentSchema>> = [];
                let consumedEntirePage = true;

                for (const file of files) {
                    if (maxResults !== undefined && processedCount >= maxResults) {
                        consumedEntirePage = false;
                        break;
                    }

                    const docResponse = await nango.get({
                        // https://developers.google.com/docs/api/reference/rest/v1/documents/get
                        endpoint: `/v1/documents/${encodeURIComponent(file.id)}`,
                        params: {
                            includeTabsContent: 'true'
                        },
                        retries: 3
                    });

                    const parsedDoc = DocsDocumentSchema.safeParse(docResponse.data);
                    if (!parsedDoc.success) {
                        throw new Error(`Failed to parse document ${file.id}: ${parsedDoc.error.message}`);
                    }

                    documents.push({
                        id: file.id,
                        documentId: file.id,
                        title: parsedDoc.data.title ?? file.name,
                        revisionId: parsedDoc.data.revisionId,
                        body: parsedDoc.data.body,
                        tabs: parsedDoc.data.tabs,
                        createdTime: file.createdTime,
                        modifiedTime: file.modifiedTime,
                        parents: file.parents,
                        mimeType: file.mimeType
                    });

                    processedCount = processedCount + 1;
                }

                if (documents.length > 0) {
                    await nango.batchSave(documents, 'FolderDocument');
                }

                const nextPageToken = parsedFiles.data.nextPageToken ?? '';

                if (maxResults !== undefined && processedCount >= maxResults) {
                    if (!consumedEntirePage || nextPageToken) {
                        completedFullRefresh = false;
                    }
                    break;
                }

                if (!nextPageToken) {
                    break;
                }

                currentPageToken = nextPageToken;

                if (useCheckpointedFullRefresh) {
                    await nango.saveCheckpoint({
                        folder_index: i,
                        page_token: currentPageToken
                    });
                }
            }

            if (useCheckpointedFullRefresh && i < folderIds.length - 1) {
                await nango.saveCheckpoint({
                    folder_index: i + 1,
                    page_token: ''
                });
            }
        }

        if (!completedFullRefresh) {
            return;
        }

        if (useCheckpointedFullRefresh) {
            await nango.clearCheckpoint();
        }

        await nango.trackDeletesEnd('FolderDocument');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
