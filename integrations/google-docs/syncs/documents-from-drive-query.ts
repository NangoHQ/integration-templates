import { createSync } from 'nango';
import { z } from 'zod';
import type { ProxyConfiguration } from '@nangohq/runner-sdk';

const MetadataSchema = z.object({
    q: z.string().optional()
});

const CheckpointSchema = z.object({
    modified_after: z.string(),
    page_token: z.string()
});

const DriveFileSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    mimeType: z.string().optional(),
    modifiedTime: z.string().optional(),
    createdTime: z.string().optional(),
    webViewLink: z.string().optional()
});

const DocsDocumentSchema = z
    .object({
        documentId: z.string().optional(),
        title: z.string().optional(),
        revisionId: z.string().optional(),
        body: z.record(z.string(), z.unknown()).optional(),
        tabs: z.array(z.record(z.string(), z.unknown())).optional()
    })
    .passthrough();

const DocumentSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    title: z.string().optional(),
    modifiedTime: z.string().optional(),
    createdTime: z.string().optional(),
    revisionId: z.string().optional(),
    documentId: z.string().optional(),
    webViewLink: z.string().optional(),
    document: z.record(z.string(), z.unknown()).optional()
});

const sync = createSync({
    description: 'Discover Google Docs files with a Drive search query, then sync each document content',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,
    endpoints: [{ method: 'GET', path: '/syncs/documents-from-drive-query' }],
    models: {
        DriveQueryDocument: DocumentSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const checkpoint = await nango.getCheckpoint();

        let modifiedAfter: string | undefined;
        let pageToken: string | undefined;

        if (checkpoint) {
            const checkpointParse = CheckpointSchema.safeParse(checkpoint);
            if (!checkpointParse.success) {
                throw new Error(`Failed to parse checkpoint: ${checkpointParse.error.message}`);
            }
            modifiedAfter = checkpointParse.data.modified_after || undefined;
            pageToken = checkpointParse.data.page_token || undefined;
        }

        let maxModifiedTime: string | undefined;

        const queryParts: string[] = ["mimeType='application/vnd.google-apps.document'"];

        if (metadata && typeof metadata === 'object' && 'q' in metadata && typeof metadata.q === 'string' && metadata.q) {
            queryParts.push(metadata.q);
        }

        if (modifiedAfter) {
            queryParts.push(`modifiedTime > '${modifiedAfter}'`);
        }

        const q = queryParts.join(' and ');

        const driveParams: Record<string, string> = {
            q,
            fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, createdTime, webViewLink)',
            orderBy: 'modifiedTime'
        };

        if (pageToken) {
            driveParams['pageToken'] = pageToken;
        }

        const proxyConfig: ProxyConfiguration = {
            baseUrlOverride: 'https://www.googleapis.com/drive/v3',
            // https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list
            endpoint: '/files',
            params: driveParams,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'pageToken',
                cursor_path_in_response: 'nextPageToken',
                response_path: 'files',
                limit_name_in_request: 'pageSize',
                limit: 100,
                on_page: async (state) => {
                    pageToken = typeof state.nextPageParam === 'string' ? state.nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const files of nango.paginate(proxyConfig)) {
            const documents = [];

            for (const rawFile of files) {
                const fileParse = DriveFileSchema.safeParse(rawFile);
                if (!fileParse.success) {
                    throw new Error(`Failed to parse Drive file: ${fileParse.error.message}`);
                }

                const file = fileParse.data;
                if (!file.id) {
                    continue;
                }

                // https://developers.google.com/docs/api/reference/rest/v1/documents/get
                const docResponse = await nango.get({
                    endpoint: `/v1/documents/${encodeURIComponent(file.id)}`,
                    params: {
                        includeTabsContent: 'true'
                    },
                    retries: 3
                });

                const docParse = DocsDocumentSchema.safeParse(docResponse.data);
                if (!docParse.success) {
                    throw new Error(`Failed to parse document: ${docParse.error.message}`);
                }

                const doc = docParse.data;

                documents.push({
                    id: file.id,
                    ...(file.name != null && { name: file.name }),
                    ...(doc.title != null && { title: doc.title }),
                    ...(file.modifiedTime != null && { modifiedTime: file.modifiedTime }),
                    ...(file.createdTime != null && { createdTime: file.createdTime }),
                    ...(doc.revisionId != null && { revisionId: doc.revisionId }),
                    ...(doc.documentId != null && { documentId: doc.documentId }),
                    ...(file.webViewLink != null && { webViewLink: file.webViewLink }),
                    document: doc
                });
            }

            if (documents.length > 0) {
                await nango.batchSave(documents, 'DriveQueryDocument');

                for (const document of documents) {
                    if (document.modifiedTime != null && (maxModifiedTime === undefined || document.modifiedTime > maxModifiedTime)) {
                        maxModifiedTime = document.modifiedTime;
                    }
                }
            }

            if (pageToken) {
                await nango.saveCheckpoint({
                    modified_after: modifiedAfter || '',
                    page_token: pageToken
                });
            }
        }

        if (maxModifiedTime != null) {
            await nango.saveCheckpoint({
                modified_after: maxModifiedTime,
                page_token: ''
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
