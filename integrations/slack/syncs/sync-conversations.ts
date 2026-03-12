import { createSync } from 'nango';
import { z } from 'zod';

const ConversationSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    created: z.number(),
    creator: z.union([z.string(), z.null()]),
    is_archived: z.boolean(),
    is_general: z.boolean(),
    is_channel: z.boolean(),
    is_group: z.boolean(),
    is_im: z.boolean(),
    is_mpim: z.boolean(),
    is_private: z.boolean(),
    is_shared: z.boolean(),
    is_ext_shared: z.boolean(),
    is_org_shared: z.boolean(),
    updated: z.number(),
    num_members: z.union([z.number(), z.null()]),
    topic: z.union([z.object({ value: z.string(), creator: z.string(), last_set: z.number() }), z.null()]),
    purpose: z.union([z.object({ value: z.string(), creator: z.string(), last_set: z.number() }), z.null()]),
    members: z.array(z.string())
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

const sync = createSync({
    description: 'Sync Slack conversations including channel members',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/sync-conversations' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,

    models: {
        Conversation: ConversationSchema
    },

    exec: async (nango) => {
        const checkpoint = (await nango.getCheckpoint()) as Checkpoint | null;
        let cursor = checkpoint?.cursor || undefined;

        while (true) {
            const response = await nango.get<{
                channels?: any[];
                response_metadata?: { next_cursor?: string };
            }>({
                // https://docs.slack.dev/reference/methods/conversations.list
                endpoint: 'conversations.list',
                params: {
                    types: 'public_channel,private_channel,mpim,im',
                    exclude_archived: 'false',
                    limit: '200',
                    ...(cursor && { cursor })
                },
                retries: 3
            });

            const batch = response.data.channels ?? [];
            const conversations = [];

            for (const channel of batch) {
                // https://docs.slack.dev/reference/methods/conversations.members
                const membersConfig = {
                    endpoint: 'conversations.members',
                    params: {
                        channel: channel.id,
                        limit: '200'
                    },
                    paginate: {
                        type: 'cursor' as const,
                        cursor_path_in_response: 'response_metadata.next_cursor',
                        cursor_name_in_request: 'cursor',
                        response_path: 'members'
                    },
                    retries: 3
                };

                const members = [];
                for await (const membersBatch of nango.paginate(membersConfig)) {
                    members.push(...membersBatch);
                }

                const conversation = {
                    id: channel.id,
                    name: channel.name || null,
                    created: channel.created || 0,
                    creator: channel.creator || null,
                    is_archived: channel.is_archived || false,
                    is_general: channel.is_general || false,
                    is_channel: channel.is_channel || false,
                    is_group: channel.is_group || false,
                    is_im: channel.is_im || false,
                    is_mpim: channel.is_mpim || false,
                    is_private: channel.is_private || false,
                    is_shared: channel.is_shared || false,
                    is_ext_shared: channel.is_ext_shared || false,
                    is_org_shared: channel.is_org_shared || false,
                    updated: channel.updated || 0,
                    num_members: channel.num_members || null,
                    topic: channel.topic || null,
                    purpose: channel.purpose || null,
                    members: members
                };

                conversations.push(conversation);
            }

            if (conversations.length > 0) {
                await nango.batchSave(conversations, 'Conversation');
            }

            const nextCursor = response.data.response_metadata?.next_cursor;
            if (nextCursor) {
                cursor = nextCursor;
                await nango.saveCheckpoint({
                    cursor
                });
                continue;
            }

            break;
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
