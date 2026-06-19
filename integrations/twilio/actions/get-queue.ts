import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    queue_sid: z.string().describe('The SID of the Queue to retrieve. Example: "QU710d79ddc79e88ff10573c8b8bdd357e"')
});

const ProviderQueueSchema = z.object({
    sid: z.string(),
    account_sid: z.string(),
    friendly_name: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    current_size: z.number().optional(),
    max_size: z.number().optional(),
    average_wait_time: z.number().optional(),
    uri: z.string().optional()
});

const OutputSchema = ProviderQueueSchema;

const action = createAction({
    description: 'Retrieve a single call queue from Twilio.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();

        const MetadataSchema = z.object({
            account_sid: z.string()
        });

        const parsedMetadata = MetadataSchema.safeParse(metadata);

        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'missing_account_sid',
                message: 'Could not retrieve AccountSid from connection metadata.'
            });
        }

        const accountSid = parsedMetadata.data.account_sid;

        const response = await nango.get({
            // https://www.twilio.com/docs/voice/api/queue-resource
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Queues/${encodeURIComponent(input.queue_sid)}.json`,
            retries: 3
        });

        const providerQueue = ProviderQueueSchema.parse(response.data);

        return {
            sid: providerQueue.sid,
            account_sid: providerQueue.account_sid,
            ...(providerQueue.friendly_name !== undefined && { friendly_name: providerQueue.friendly_name }),
            ...(providerQueue.date_created !== undefined && { date_created: providerQueue.date_created }),
            ...(providerQueue.date_updated !== undefined && { date_updated: providerQueue.date_updated }),
            ...(providerQueue.current_size !== undefined && { current_size: providerQueue.current_size }),
            ...(providerQueue.max_size !== undefined && { max_size: providerQueue.max_size }),
            ...(providerQueue.average_wait_time !== undefined && { average_wait_time: providerQueue.average_wait_time }),
            ...(providerQueue.uri !== undefined && { uri: providerQueue.uri })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
