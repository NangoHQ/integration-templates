import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderDocSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string().nullable(),
    href: z.string().nullable(),
    browserLink: z.string().nullable(),
    owner: z.string().nullable(),
    ownerName: z.string().nullable(),
    createdAt: z.string().nullable(),
    updatedAt: z.string().nullable(),
    workspaceId: z.string().nullable().optional(),
    folderId: z.string().nullable().optional()
});

const DocSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    href: z.string().optional(),
    browserLink: z.string().optional(),
    owner: z.string().optional(),
    ownerName: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    workspaceId: z.string().optional(),
    folderId: z.string().optional()
});

const CheckpointSchema = z.object({
    page_token: z.string()
});

const sync = createSync({
    description: 'Sync all docs accessible to the authenticated user',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Doc: DocSchema
    },
    // https://coda.io/developers/apis/v1#tag/Docs/operation/listDocs
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/docs'
        }
    ],

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { page_token: '' });
        let pageToken: string | undefined = checkpoint.page_token || undefined;

        // https://coda.io/developers/apis/v1#tag/Docs/operation/listDocs
        if (!pageToken) {
            await nango.trackDeletesStart('Doc');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://coda.io/developers/apis/v1#tag/Docs/operation/listDocs
            endpoint: '/docs',
            params: {
                ...(pageToken ? { pageToken } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'pageToken',
                cursor_path_in_response: 'nextPageToken',
                response_path: 'items',
                limit: 100,
                limit_name_in_request: 'limit',
                on_page: async (paginationState) => {
                    pageToken = typeof paginationState.nextPageParam === 'string' ? paginationState.nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected page to be an array of docs');
            }

            const docs = [];
            for (const raw of page) {
                const parsed = ProviderDocSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse doc: ${parsed.error.message}`);
                }
                const record = parsed.data;
                docs.push({
                    id: record.id,
                    ...(record.name != null && { name: record.name }),
                    ...(record.type != null && { type: record.type }),
                    ...(record.href != null && { href: record.href }),
                    ...(record.browserLink != null && { browserLink: record.browserLink }),
                    ...(record.owner != null && { owner: record.owner }),
                    ...(record.ownerName != null && { ownerName: record.ownerName }),
                    ...(record.createdAt != null && { createdAt: record.createdAt }),
                    ...(record.updatedAt != null && { updatedAt: record.updatedAt }),
                    ...(record.workspaceId != null && { workspaceId: record.workspaceId }),
                    ...(record.folderId != null && { folderId: record.folderId })
                });
            }

            if (docs.length > 0) {
                await nango.batchSave(docs, 'Doc');
            }

            await nango.saveCheckpoint({ page_token: pageToken ?? '' });
        }

        await nango.trackDeletesEnd('Doc');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
