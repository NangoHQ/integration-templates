import { createSync } from 'nango';
import { z } from 'zod';

const DriveOwnerSchema = z.object({
    displayName: z.string().optional(),
    emailAddress: z.string().optional()
});

const DriveFileSchema = z.object({
    id: z.string(),
    name: z.string(),
    modifiedTime: z.string(),
    createdTime: z.string().optional(),
    mimeType: z.string().optional(),
    owners: z.array(DriveOwnerSchema).optional(),
    lastModifyingUser: DriveOwnerSchema.optional()
});

const DocumentResponseSchema = z.object({
    documentId: z.string().optional(),
    title: z.string().optional(),
    revisionId: z.string().optional(),
    body: z.unknown().optional()
});

const DriveFileListSchema = z.object({
    nextPageToken: z.string().optional(),
    files: z.array(DriveFileSchema).optional()
});

const CheckpointSchema = z.object({
    modified_after: z.string(),
    page_token: z.string(),
    max_modified_time: z.string()
});

const MetadataSchema = z.object({
    maxResults: z.number().int().positive().optional()
});

const DocumentSchema = z.object({
    id: z.string(),
    name: z.string(),
    modifiedTime: z.string(),
    createdTime: z.string().optional(),
    mimeType: z.string().optional(),
    title: z.string().optional(),
    revisionId: z.string().optional(),
    body: z.unknown().optional()
});

interface DocumentRecord extends Record<string, unknown> {
    id: string;
}

const sync = createSync({
    description: 'Sync recently modified Google Docs files from Drive and fetch current document content for each changed file.',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/recent-documents' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,
    models: {
        RecentDocument: DocumentSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        let modifiedAfter = '';
        let pageToken = '';
        let maxModifiedTime = '';

        if (rawCheckpoint !== null && rawCheckpoint !== undefined) {
            const checkpoint = CheckpointSchema.safeParse(rawCheckpoint);
            if (!checkpoint.success) {
                throw new Error(`Failed to parse checkpoint: ${checkpoint.error.message}`);
            }

            modifiedAfter = checkpoint.data.modified_after;
            pageToken = checkpoint.data.page_token;
            maxModifiedTime = checkpoint.data.max_modified_time;
        }

        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.safeParse(rawMetadata ?? {});
        if (!metadata.success) {
            throw new Error(`Invalid metadata: ${metadata.error.message}`);
        }

        const pageSize = 100;
        const maxResults = metadata.data?.maxResults;
        let totalFetched = 0;

        const driveQueryParts = ["mimeType='application/vnd.google-apps.document'"];
        if (modifiedAfter) {
            driveQueryParts.push(`modifiedTime > '${modifiedAfter}'`);
        }
        const q = driveQueryParts.join(' and ');

        let completedWindow = true;

        while (true) {
            const remainingResults = maxResults !== undefined ? maxResults - totalFetched : pageSize;
            if (remainingResults <= 0) {
                completedWindow = false;
                break;
            }

            const response = await nango.get({
                // https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list
                endpoint: '/drive/v3/files',
                baseUrlOverride: 'https://www.googleapis.com',
                params: {
                    q,
                    orderBy: 'modifiedTime desc',
                    fields: 'nextPageToken, files(id, name, modifiedTime, createdTime, mimeType, owners(displayName, emailAddress), lastModifyingUser(displayName, emailAddress))',
                    includeItemsFromAllDrives: 'true',
                    supportsAllDrives: 'true',
                    pageSize: Math.min(pageSize, remainingResults),
                    ...(pageToken ? { pageToken } : {})
                },
                retries: 3
            });

            const filesParse = DriveFileListSchema.safeParse(response.data);
            if (!filesParse.success) {
                throw new Error(`Failed to parse Drive files: ${filesParse.error.message}`);
            }

            const pageFiles = filesParse.data.files ?? [];

            const documents: DocumentRecord[] = [];

            for (const file of pageFiles) {
                // https://developers.google.com/docs/api/reference/rest/v1/documents/get
                const docResponse = await nango.get({
                    endpoint: `/v1/documents/${encodeURIComponent(file.id)}`,
                    params: {
                        includeTabsContent: 'true'
                    },
                    retries: 3
                });

                const docParse = DocumentResponseSchema.safeParse(docResponse.data);
                if (!docParse.success) {
                    throw new Error(`Failed to parse document ${file.id}: ${docParse.error.message}`);
                }

                const doc = docParse.data;

                const document: DocumentRecord = {
                    id: file.id,
                    name: file.name,
                    modifiedTime: file.modifiedTime
                };
                if (file.createdTime !== undefined) {
                    document['createdTime'] = file.createdTime;
                }
                if (file.mimeType !== undefined) {
                    document['mimeType'] = file.mimeType;
                }
                if (doc.title !== undefined) {
                    document['title'] = doc.title;
                }
                if (doc.revisionId !== undefined) {
                    document['revisionId'] = doc.revisionId;
                }
                if (doc.body !== undefined) {
                    document['body'] = doc.body;
                }

                documents.push(document);
                if (!maxModifiedTime || file.modifiedTime > maxModifiedTime) {
                    maxModifiedTime = file.modifiedTime;
                }
            }

            if (documents.length > 0) {
                await nango.batchSave(documents, 'RecentDocument');
            }

            totalFetched += pageFiles.length;

            const nextPageToken = filesParse.data.nextPageToken ?? '';

            if (nextPageToken) {
                pageToken = nextPageToken;
                await nango.saveCheckpoint({
                    modified_after: modifiedAfter,
                    page_token: pageToken,
                    max_modified_time: maxModifiedTime
                });

                if (maxResults !== undefined && totalFetched >= maxResults) {
                    completedWindow = false;
                    break;
                }

                continue;
            }

            pageToken = '';
            break;
        }

        if (completedWindow) {
            modifiedAfter = maxModifiedTime || modifiedAfter;
            await nango.saveCheckpoint({
                modified_after: modifiedAfter,
                page_token: '',
                max_modified_time: modifiedAfter
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
