import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PageSchema = z.object({
    id: z.string(),
    name: z.string(),
    category: z.string().optional(),
    access_token: z.string()
});

const ProviderPageSchema = z.object({
    id: z.string(),
    name: z.string(),
    category: z.string().nullable().optional(),
    access_token: z.string()
});

const CheckpointSchema = z.object({
    after: z.string()
});

const sync = createSync({
    description: 'Sync Facebook Pages the authenticated user can access',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Page: PageSchema
    },
    // https://developers.facebook.com/docs/graph-api/reference/user/accounts/
    endpoints: [
        {
            path: '/syncs/pages',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Blocker: The /me/accounts endpoint does not support timestamp filtering,
        // changed-records feeds, or resumable cursors. It returns all pages the
        // user has access to in a single response with basic cursor pagination.
        const rawCheckpoint = await nango.getCheckpoint();
        let nextAfter: string | undefined = '';
        if (rawCheckpoint != null) {
            const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
            if (!checkpointResult.success) {
                throw new Error(`Invalid checkpoint: ${checkpointResult.error.message}`);
            }
            nextAfter = checkpointResult.data.after;
        }

        await nango.trackDeletesStart('Page');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.facebook.com/docs/graph-api/reference/user/accounts/
            endpoint: '/me/accounts',
            params: {
                fields: 'id,name,category,access_token',
                ...(nextAfter && { after: nextAfter })
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'paging.cursors.after',
                cursor_name_in_request: 'after',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    nextAfter = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parseResult = z.array(ProviderPageSchema).safeParse(page);
            if (!parseResult.success) {
                throw new Error(`Failed to parse page data: ${parseResult.error.message}`);
            }

            const pages = parseResult.data.map((record) => ({
                id: record.id,
                name: record.name,
                ...(record.category != null && { category: record.category }),
                access_token: record.access_token
            }));

            if (pages.length > 0) {
                await nango.batchSave(pages, 'Page');
            }

            if (nextAfter) {
                await nango.saveCheckpoint({ after: nextAfter });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Page');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
