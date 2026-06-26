import { createSync } from 'nango';
import { z } from 'zod';

const ChannelSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    created_by: z.string().optional(),
    is_private: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            channels: z
                .array(
                    z.object({
                        id: z.string(),
                        title: z.string().optional(),
                        is_private: z.boolean().optional(),
                        created_by: z.string().optional(),
                        created_at: z.string().optional(),
                        updated_at: z.string().optional()
                    })
                )
                .optional()
        })
        .optional()
});

const sync = createSync({
    description: 'Full-refresh sync of workspace channels',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            path: '/syncs/channels',
            method: 'POST'
        }
    ],
    models: {
        Channel: ChannelSchema
    },

    exec: async (nango) => {
        // Blocker: the channels query has no arguments, no pagination, and no changed-since filter.
        await nango.trackDeletesStart('Channel');

        // https://docs.fireflies.ai/graphql-api/query/channels
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: 'query Channels { channels { id title is_private created_by created_at updated_at } }'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error('Failed to parse channels response');
        }

        const channels = parsed.data.data?.channels ?? [];
        const records = channels.map((channel) => ({
            id: channel.id,
            ...(channel.title != null && { title: channel.title }),
            ...(channel.created_at != null && { created_at: channel.created_at }),
            ...(channel.updated_at != null && { updated_at: channel.updated_at }),
            ...(channel.created_by != null && { created_by: channel.created_by }),
            ...(channel.is_private != null && { is_private: channel.is_private })
        }));

        if (records.length > 0) {
            await nango.batchSave(records, 'Channel');
        }

        await nango.trackDeletesEnd('Channel');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
