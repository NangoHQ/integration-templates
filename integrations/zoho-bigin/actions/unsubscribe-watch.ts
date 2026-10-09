import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        channel_ids: z.array(z.string().min(1)).min(1).describe('One or more active notification channel IDs to unsubscribe from. Example: ["9876543210123"].')
    })
    .describe('Channel IDs of the active webhook subscriptions to remove.');

const ProviderWatchResultSchema = z.object({
    code: z.string().optional(),
    status: z.string().optional(),
    message: z.string().optional(),
    details: z
        .object({
            channel_id: z.string().optional(),
            resource_uri: z.string().optional(),
            resource_id: z.string().optional()
        })
        .nullable()
        .optional()
});

const ProviderResponseSchema = z.object({
    watch: z.array(ProviderWatchResultSchema).optional()
});

const WatchResultSchema = z.object({
    channel_id: z.string().optional().describe('Channel ID that was unsubscribed, when the provider reports it.'),
    code: z.string().optional().describe("Provider result code for this channel, e.g. 'SUCCESS' or 'NOT_SUBSCRIBED'."),
    status: z.string().optional().describe("Provider status for this channel: 'success' or 'error'."),
    message: z.string().optional().describe('Human-readable provider result message.'),
    resource_uri: z.string().optional().describe('URI of the module the channel was watching, when reported.'),
    resource_id: z.string().optional().describe('ID of the watched resource, when reported.')
});

const OutputSchema = z
    .object({
        results: z.array(WatchResultSchema).describe('One result per requested channel ID, in the order reported by the provider.')
    })
    .describe('Per-channel outcome of the unsubscribe request.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes one or more active webhook notification channels via the provider's actions/watch endpoint.
 * @pitfalls: Removing a channel is permanent, so notifications only resume after re-subscribing; unsubscribing a channel that is not currently subscribed still returns a successful HTTP status (202) but reports a per-channel status of 'error' with code 'NOT_SUBSCRIBED' and omits that result's channel_id, so inspect each result instead of relying on the response status alone.
 */
const action = createAction({
    description: 'Remove one or more active webhook subscriptions by channel ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.notifications.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://www.bigin.com/developer/docs/apis/notifications/disable.html
            endpoint: '/bigin/v2/actions/watch',
            params: {
                channel_ids: input.channel_ids.join(',')
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const results = (parsed.watch ?? []).map((entry) => ({
            ...(entry.details?.channel_id != null && { channel_id: entry.details.channel_id }),
            ...(entry.code != null && { code: entry.code }),
            ...(entry.status != null && { status: entry.status }),
            ...(entry.message != null && { message: entry.message }),
            ...(entry.details?.resource_uri != null && { resource_uri: entry.details.resource_uri }),
            ...(entry.details?.resource_id != null && { resource_id: entry.details.resource_id })
        }));

        return { results };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
