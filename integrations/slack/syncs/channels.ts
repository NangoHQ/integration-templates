import { createSync } from 'nango';
import { z } from 'zod';

// https://docs.slack.dev/reference/methods/conversations.list/

const ChannelSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    name_normalized: z.string().optional(),
    created: z.number(),
    creator: z.string().optional(),
    is_archived: z.boolean(),
    is_general: z.boolean(),
    is_private: z.boolean(),
    is_channel: z.boolean(),
    is_group: z.boolean(),
    is_im: z.boolean(),
    is_mpim: z.boolean(),
    is_shared: z.boolean().optional(),
    is_org_shared: z.boolean().optional(),
    is_ext_shared: z.boolean().optional(),
    is_pending_ext_shared: z.boolean().optional(),
    is_member: z.boolean().optional(),
    num_members: z.number().optional(),
    topic: z.object({
        value: z.string(),
        creator: z.string().optional(),
        last_set: z.number()
    }),
    purpose: z.object({
        value: z.string(),
        creator: z.string().optional(),
        last_set: z.number()
    })
});

const MetadataSchema = z.object({
    joinPublicChannels: z.boolean().optional().describe('Whether to auto-join public channels')
});

const CheckpointSchema = z.object({
    cursor: z.string(),
    types: z.string()
});

type ChannelType = z.infer<typeof ChannelSchema>;

function parseOptional<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
    const result = schema.safeParse(value);
    return result.success ? result.data : undefined;
}

const sync = createSync({
    description: 'Sync conversations allowed by granted scopes - public/private channels, DMs, and group DMs',
    version: '3.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/channels', group: 'Channels' }],
    frequency: 'every 5 minutes',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,

    models: {
        Channel: ChannelSchema
    },

    exec: async (nango) => {
        const metadata = parseOptional(MetadataSchema, await nango.getMetadata());
        const checkpoint = parseOptional(CheckpointSchema, await nango.getCheckpoint());

        // Types to fetch based on granted scopes
        // conversations.list accepts channels:read, groups:read, mpim:read, im:read
        // It will only return the conversation types the token has scopes for
        const typesToFetch = ['public_channel', 'private_channel', 'mpim', 'im'];

        let currentTypeIndex = 0;
        let currentCursor: string | undefined;

        // Resume from checkpoint if available
        if (checkpoint && checkpoint.types) {
            const savedTypeIndex = typesToFetch.indexOf(checkpoint.types);
            if (savedTypeIndex !== -1) {
                currentTypeIndex = savedTypeIndex;
                currentCursor = checkpoint.cursor;
            }
        }

        while (currentTypeIndex < typesToFetch.length) {
            const currentType = typesToFetch[currentTypeIndex]!;

            // Build params conditionally
            const params: Record<string, string | number> = {
                types: currentType,
                limit: 1000
            };
            if (currentCursor) {
                params['cursor'] = currentCursor;
            }

            // https://docs.slack.dev/reference/methods/conversations.list/
            const config = {
                endpoint: 'conversations.list',
                params,
                retries: 3
            };

            const response = await nango.get(config);

            if (!response.data || !response.data.channels) {
                // No channels for this type or insufficient scope, move to next type
                currentTypeIndex++;
                currentCursor = undefined;
                continue;
            }

            // Map API response to schema
            const channels: ChannelType[] = response.data.channels.map((rawChannel: any) => ({
                id: rawChannel.id,
                name: rawChannel.name ?? undefined,
                name_normalized: rawChannel.name_normalized ?? undefined,
                created: rawChannel.created,
                creator: rawChannel.creator ?? undefined,
                is_archived: rawChannel.is_archived ?? false,
                is_general: rawChannel.is_general ?? false,
                is_private: rawChannel.is_private ?? false,
                is_channel: rawChannel.is_channel ?? false,
                is_group: rawChannel.is_group ?? false,
                is_im: rawChannel.is_im ?? false,
                is_mpim: rawChannel.is_mpim ?? false,
                is_shared: rawChannel.is_shared,
                is_org_shared: rawChannel.is_org_shared,
                is_ext_shared: rawChannel.is_ext_shared,
                is_pending_ext_shared: rawChannel.is_pending_ext_shared,
                is_member: rawChannel.is_member,
                num_members: rawChannel.num_members,
                topic: {
                    value: rawChannel.topic?.value ?? '',
                    creator: rawChannel.topic?.creator ?? undefined,
                    last_set: rawChannel.topic?.last_set ?? 0
                },
                purpose: {
                    value: rawChannel.purpose?.value ?? '',
                    creator: rawChannel.purpose?.creator ?? undefined,
                    last_set: rawChannel.purpose?.last_set ?? 0
                }
            }));

            // Optionally join public channels
            if (metadata?.joinPublicChannels && currentType === 'public_channel') {
                for (const channel of channels) {
                    if (channel.id && !channel.is_member && !channel.is_archived) {
                        try {
                            // https://docs.slack.dev/reference/methods/conversations.join/
                            await nango.post({
                                endpoint: 'conversations.join',
                                data: { channel: channel.id },
                                retries: 3
                            });
                        } catch {
                            // Ignore join errors - channel may require admin or be restricted
                        }
                    }
                }
            }

            if (channels.length > 0) {
                await nango.batchSave(channels, 'Channel');
            }

            // Handle pagination
            const nextCursor: string | undefined = response.data.response_metadata?.next_cursor;

            if (nextCursor) {
                currentCursor = nextCursor;
                await nango.saveCheckpoint({
                    cursor: nextCursor,
                    types: currentType
                });
            } else {
                // Move to next channel type
                currentTypeIndex++;
                currentCursor = undefined;
                // Only save checkpoint if there are more types to process
                if (currentTypeIndex < typesToFetch.length) {
                    const nextType = typesToFetch[currentTypeIndex];
                    if (nextType) {
                        await nango.saveCheckpoint({
                            cursor: '',
                            types: nextType
                        });
                    }
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
