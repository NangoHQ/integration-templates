import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    friendly_name: z.string().describe('A descriptive string for the queue. Example: "Support Queue"'),
    max_size: z.number().int().min(1).max(1000).optional().describe('The maximum number of calls allowed in the queue. Default: 100, max: 1000.')
});

const ProviderQueueSchema = z.object({
    account_sid: z.string(),
    average_wait_time: z.number().optional(),
    current_size: z.number().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    friendly_name: z.string().optional(),
    max_size: z.number().optional(),
    sid: z.string().optional(),
    uri: z.string().optional()
});

const OutputSchema = z.object({
    account_sid: z.string(),
    average_wait_time: z.number().optional(),
    current_size: z.number().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    friendly_name: z.string().optional(),
    max_size: z.number().optional(),
    sid: z.string().optional(),
    uri: z.string().optional()
});

const action = createAction({
    description: 'Create a call queue in Twilio.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-queue',
        group: 'Queues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        let accountSid: string | undefined;

        if (
            connection.credentials &&
            typeof connection.credentials === 'object' &&
            'type' in connection.credentials &&
            connection.credentials.type === 'BASIC'
        ) {
            const creds = connection.credentials;
            if ('username' in creds && typeof creds.username === 'string') {
                accountSid = creds.username;
            }
        }

        if (!accountSid) {
            const metadata = await nango.getMetadata();
            const metadataSchema = z.object({
                account_sid: z.string().optional()
            });
            const metadataResult = metadataSchema.safeParse(metadata);
            if (metadataResult.success && metadataResult.data.account_sid) {
                accountSid = metadataResult.data.account_sid;
            }
        }

        if (!accountSid) {
            throw new nango.ActionError({
                type: 'invalid_credentials',
                message: 'Account SID not found in connection credentials or metadata.'
            });
        }
        const params = new URLSearchParams();
        params.append('FriendlyName', input.friendly_name);
        if (input.max_size !== undefined) {
            params.append('MaxSize', String(input.max_size));
        }

        const response = await nango.post({
            // https://www.twilio.com/docs/voice/api/queue-resource#create-a-queue
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Queues.json`,
            data: params.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 3
        });

        const providerQueue = ProviderQueueSchema.parse(response.data);

        return {
            account_sid: providerQueue.account_sid,
            ...(providerQueue.average_wait_time !== undefined && { average_wait_time: providerQueue.average_wait_time }),
            ...(providerQueue.current_size !== undefined && { current_size: providerQueue.current_size }),
            ...(providerQueue.date_created !== undefined && { date_created: providerQueue.date_created }),
            ...(providerQueue.date_updated !== undefined && { date_updated: providerQueue.date_updated }),
            ...(providerQueue.friendly_name !== undefined && { friendly_name: providerQueue.friendly_name }),
            ...(providerQueue.max_size !== undefined && { max_size: providerQueue.max_size }),
            ...(providerQueue.sid !== undefined && { sid: providerQueue.sid }),
            ...(providerQueue.uri !== undefined && { uri: providerQueue.uri })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
