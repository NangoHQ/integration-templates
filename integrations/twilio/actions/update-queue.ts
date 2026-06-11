import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    account_sid: z.string().optional()
});

const InputSchema = z.object({
    queueSid: z.string().describe('The SID of the queue to update. Example: "QU710d79ddc79e88ff10573c8b8bdd357e"'),
    friendlyName: z.string().optional().describe('A human-readable name for the queue.'),
    maxSize: z.number().optional().describe('The maximum number of callers allowed in the queue.')
});

const ProviderQueueSchema = z.object({
    sid: z.string(),
    friendly_name: z.string().optional(),
    max_size: z.number().optional(),
    account_sid: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    uri: z.string().optional(),
    current_size: z.number().optional(),
    average_wait_time: z.number().optional()
});

const OutputSchema = z.object({
    sid: z.string(),
    friendlyName: z.string().optional(),
    maxSize: z.number().optional(),
    accountSid: z.string().optional(),
    dateCreated: z.string().optional(),
    dateUpdated: z.string().optional(),
    uri: z.string().optional(),
    currentSize: z.number().optional(),
    averageWaitTime: z.number().optional()
});

const action = createAction({
    description: 'Update a call queue in Twilio.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-queue',
        group: 'Queues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.parse(metadata);
        const accountSid = parsedMetadata.account_sid;

        if (!accountSid) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'account_sid is required in connection metadata.'
            });
        }

        const bodyParams = new URLSearchParams();
        if (input.friendlyName !== undefined) {
            bodyParams.set('FriendlyName', input.friendlyName);
        }
        if (input.maxSize !== undefined) {
            bodyParams.set('MaxSize', String(input.maxSize));
        }

        // https://www.twilio.com/docs/voice/api/queue-resource#update-a-queue-resource
        const response = await nango.post({
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Queues/${encodeURIComponent(input.queueSid)}.json`,
            data: bodyParams.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 10
        });

        const providerQueue = ProviderQueueSchema.parse(response.data);

        return {
            sid: providerQueue.sid,
            ...(providerQueue.friendly_name != null && { friendlyName: providerQueue.friendly_name }),
            ...(providerQueue.max_size != null && { maxSize: providerQueue.max_size }),
            ...(providerQueue.account_sid != null && { accountSid: providerQueue.account_sid }),
            ...(providerQueue.date_created != null && { dateCreated: providerQueue.date_created }),
            ...(providerQueue.date_updated != null && { dateUpdated: providerQueue.date_updated }),
            ...(providerQueue.uri != null && { uri: providerQueue.uri }),
            ...(providerQueue.current_size != null && { currentSize: providerQueue.current_size }),
            ...(providerQueue.average_wait_time != null && { averageWaitTime: providerQueue.average_wait_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
