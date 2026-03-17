import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ConversationSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    created: z.number(),
    creator: z.string().optional(),
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
    num_members: z.number().optional(),
    topic: z.object({ value: z.string(), creator: z.string(), last_set: z.number() }).optional(),
    purpose: z.object({ value: z.string(), creator: z.string(), last_set: z.number() }).optional(),
    members: z.array(z.string())
});

const CheckpointSchema = z.object({
    updated_after: z.number()
});

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
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.['updated_after'];

        // https://docs.slack.dev/reference/methods/conversations.list
        const listConfig = {
            endpoint: 'conversations.list',
            params: {
                types: 'public_channel,private_channel,mpim,im',
                exclude_archived: 'false',
                limit: '200',
                ...(updatedAfter && { updated_after: updatedAfter.toString() })
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'response_metadata.next_cursor',
                cursor_name_in_request: 'cursor',
                response_path: 'channels'
            },
            retries: 3
        } satisfies ProxyConfiguration;

        let maxUpdated: number = typeof updatedAfter === 'number' ? updatedAfter : 0;

        for await (const batch of nango.paginate(listConfig)) {
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
                        type: 'cursor',
                        cursor_path_in_response: 'response_metadata.next_cursor',
                        cursor_name_in_request: 'cursor',
                        response_path: 'members'
                    },
                    retries: 3
                } satisfies ProxyConfiguration;

                const members = [];
                for await (const membersBatch of nango.paginate(membersConfig)) {
                    members.push(...membersBatch);
                }

                const conversation = {
                    id: channel.id,
                    name: channel.name || undefined,
                    created: channel.created || 0,
                    creator: channel.creator || undefined,
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
                    num_members: channel.num_members || undefined,
                    topic: channel.topic || undefined,
                    purpose: channel.purpose || undefined,
                    members: members
                };

                conversations.push(conversation);

                const channelUpdated = typeof channel.updated === 'number' ? channel.updated : 0;
                if (channelUpdated > maxUpdated) {
                    maxUpdated = channelUpdated;
                }
            }

            if (conversations.length > 0) {
                await nango.batchSave(conversations, 'Conversation');
            }
        }

        if (maxUpdated > 0) {
            await nango.saveCheckpoint({ updated_after: maxUpdated });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
