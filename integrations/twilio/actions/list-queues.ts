import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination page token from the previous response. Omit for the first page.'),
    page_size: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('How many resources to return in each list page. The default is 50, and the maximum is 1000.')
});

const QueueSchema = z.object({
    account_sid: z.string().optional(),
    average_wait_time: z.number().int().optional(),
    current_size: z.number().int().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    friendly_name: z.string().optional(),
    max_size: z.number().int().optional(),
    sid: z.string().optional(),
    uri: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(QueueSchema),
    next_page_uri: z.string().optional()
});

const action = createAction({
    description: 'List call queues from Twilio.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ account_sid?: string }>();
        const accountSid = metadata?.account_sid;

        if (!accountSid) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'account_sid is required in connection metadata.'
            });
        }

        const response = await nango.get({
            // https://www.twilio.com/docs/voice/api/queue-resource#retrieve-a-list-of-queues
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Queues.json`,
            params: {
                ...(input.cursor !== undefined && { PageToken: input.cursor }),
                ...(input.page_size !== undefined && { PageSize: input.page_size })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                queues: z.array(z.object({}).passthrough()).optional(),
                next_page_uri: z.string().nullable().optional()
            })
            .passthrough()
            .parse(response.data);

        const items = (providerResponse.queues || []).map((queue: unknown) => {
            return QueueSchema.parse(queue);
        });

        let nextPageToken: string | undefined;
        if (providerResponse.next_page_uri) {
            const url = new URL(providerResponse.next_page_uri, 'https://api.twilio.com');
            nextPageToken = url.searchParams.get('PageToken') ?? undefined;
        }

        return {
            items,
            ...(nextPageToken !== undefined && { next_page_uri: nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
