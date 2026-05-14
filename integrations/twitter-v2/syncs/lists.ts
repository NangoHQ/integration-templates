import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// https://docs.x.com/x-api/users/get-owned-lists

const ListSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    created_at: z.string().optional(),
    private: z.boolean().optional(),
    owner_id: z.string().optional(),
    follower_count: z.number().int().optional(),
    member_count: z.number().int().optional()
});

const sync = createSync({
    description: 'Sync lists from Twitter/X.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        List: ListSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/lists'
        }
    ],
    scopes: ['list.read', 'users.read'],

    exec: async (nango) => {
        // Blocker: The X API does not support filtering lists by modification time,
        // changed-records endpoints, or cursors that survive across sync runs.
        // We must fetch all lists each run. Deletion detection is required.
        await nango.trackDeletesStart('List');

        // https://docs.x.com/x-api/users/user-lookup
        const userResponse = await nango.get<{
            data: { id: string };
        }>({
            endpoint: '/2/users/me',
            retries: 3
        });

        const userId = userResponse.data?.data?.id;

        if (!userId) {
            throw new Error('Failed to fetch user ID from /2/users/me');
        }

        // https://docs.x.com/x-api/users/get-owned-lists
        const proxyConfig: ProxyConfiguration = {
            // https://docs.x.com/x-api/users/get-owned-lists
            endpoint: `/2/users/${userId}/owned_lists`,
            params: {
                'list.fields': 'description,created_at,private,owner_id,follower_count,member_count',
                max_results: 100
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'pagination_token',
                cursor_path_in_response: 'meta.next_token',
                response_path: 'data',
                limit: 100,
                limit_name_in_request: 'max_results'
            },
            retries: 3
        };

        for await (const page of nango.paginate<{
            id: string;
            name: string;
            description?: string | null;
            created_at?: string;
            private?: boolean;
            owner_id?: string;
            follower_count?: number;
            member_count?: number;
        }>(proxyConfig)) {
            const lists = page.map((list) => ({
                id: list.id,
                name: list.name,
                ...(list.description != null && { description: list.description }),
                ...(list.created_at != null && { created_at: list.created_at }),
                ...(list.private != null && { private: list.private }),
                ...(list.owner_id != null && { owner_id: list.owner_id }),
                ...(list.follower_count != null && { follower_count: list.follower_count }),
                ...(list.member_count != null && { member_count: list.member_count })
            }));

            if (lists.length > 0) {
                await nango.batchSave(lists, 'List');
            }
        }

        await nango.trackDeletesEnd('List');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
