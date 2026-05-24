import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PageSchema = z.object({
    id: z.string(),
    name: z.string(),
    category: z.string().optional(),
    access_token: z.string()
});

const sync = createSync({
    description: 'Sync Facebook Pages the authenticated user can access',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
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
        await nango.trackDeletesStart('Page');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.facebook.com/docs/graph-api/reference/user/accounts/
            endpoint: '/me/accounts',
            params: {
                fields: 'id,name,category,access_token'
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'paging.cursors.after',
                cursor_name_in_request: 'after',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const pages = page.map((record: { id: string; name: string; category?: string | null; access_token: string }) => ({
                id: record.id,
                name: record.name,
                ...(record.category != null && { category: record.category }),
                access_token: record.access_token
            }));

            if (pages.length > 0) {
                await nango.batchSave(pages, 'Page');
            }
        }

        await nango.trackDeletesEnd('Page');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
