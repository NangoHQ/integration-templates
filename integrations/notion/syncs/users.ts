import { createSync } from 'nango';
import { z } from 'zod';

const NotionListUsersResponseSchema = z.object({
    object: z.literal('list'),
    results: z.array(
        z.object({
            id: z.string(),
            object: z.literal('user'),
            type: z.enum(['person', 'bot']),
            name: z.string().nullable(),
            avatar_url: z.string().nullable().optional()
        })
    ),
    next_cursor: z.string().nullable().optional(),
    has_more: z.boolean()
});

const UserSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.enum(['person', 'bot']),
    avatar_url: z.string().optional()
});

const CheckpointSchema = z.object({
    start_cursor: z.string()
});

const sync = createSync({
    description: 'Sync Notion users and bots visible to the integration.',
    version: '2.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        User: UserSchema
    },
    endpoints: [
        {
            path: '/syncs/users',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = rawCheckpoint ? CheckpointSchema.safeParse(rawCheckpoint) : null;

        // Blocker: Notion users API does not support changed-since filters,
        // has no deleted users endpoint, and does not return modification timestamps.
        // This stays a full refresh sync and uses the cursor only to resume
        // interrupted runs safely.
        await nango.trackDeletesStart('User');

        let cursor = parsedCheckpoint?.success ? parsedCheckpoint.data.start_cursor : undefined;
        let checkpointSaved = false;

        do {
            // https://developers.notion.com/reference/get-users
            const response = await nango.get({
                endpoint: '/v1/users',
                params: {
                    page_size: 100,
                    ...(cursor && { start_cursor: cursor })
                },
                retries: 3
            });

            const parseResult = NotionListUsersResponseSchema.safeParse(response.data);
            if (!parseResult.success) {
                throw new Error(`Failed to parse users response: ${parseResult.error.message}`);
            }

            const data = parseResult.data;
            const users = data.results.map((user) => ({
                id: user.id,
                ...(user.name && { name: user.name }),
                type: user.type,
                ...(user.avatar_url && { avatar_url: user.avatar_url })
            }));

            if (users.length > 0) {
                await nango.batchSave(users, 'User');
            }

            const nextCursor = data.has_more ? (data.next_cursor ?? undefined) : undefined;
            if (nextCursor) {
                await nango.saveCheckpoint({ start_cursor: nextCursor });
                checkpointSaved = true;
            }

            cursor = nextCursor;
        } while (cursor);

        if (checkpointSaved) {
            await nango.clearCheckpoint();
        }
        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
