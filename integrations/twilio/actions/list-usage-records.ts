import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    category: z.string().optional().describe('Usage category to filter by. Example: "sms", "calls", "recordings".'),
    start_date: z.string().optional().describe('Start date in YYYY-MM-DD format. Only include usage on or after this date.'),
    end_date: z.string().optional().describe('End date in YYYY-MM-DD format. Only include usage on or before this date.'),
    cursor: z.string().optional().describe('Pagination page token from the previous response. Omit for the first page.')
});

const UsageRecordSchema = z.object({
    account_sid: z.string().optional(),
    api_version: z.string().optional(),
    as_of: z.string().optional(),
    category: z.string().optional(),
    count: z.string().nullable().optional(),
    count_unit: z.string().optional(),
    description: z.string().optional(),
    end_date: z.string().optional(),
    price: z.string().nullable().optional(),
    price_unit: z.string().optional(),
    start_date: z.string().optional(),
    subresource_uris: z.record(z.string(), z.string()).optional(),
    uri: z.string().optional(),
    usage: z.string().nullable().optional(),
    usage_unit: z.string().optional()
});

const ProviderResponseSchema = z.object({
    usage_records: z.array(z.unknown()).optional(),
    next_page_uri: z.string().nullable().optional(),
    page: z.number().optional(),
    page_size: z.number().optional(),
    previous_page_uri: z.string().nullable().optional(),
    uri: z.string().optional(),
    start: z.number().optional(),
    end: z.number().optional(),
    first_page_uri: z.string().optional()
});

const OutputSchema = z.object({
    usage_records: z.array(UsageRecordSchema),
    next_page_token: z.string().optional()
});

const MetadataSchema = z.object({
    account_sid: z.string().optional()
});

const action = createAction({
    description: 'List usage and billing records from Twilio.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-usage-records',
        group: 'Usage'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());
        const accountSid = metadata.account_sid;

        if (!accountSid) {
            throw new nango.ActionError({
                type: 'missing_account',
                message: 'Could not retrieve AccountSid from metadata.'
            });
        }

        const response = await nango.get({
            // https://www.twilio.com/docs/usage/api/usage-record
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Usage/Records.json`,
            params: {
                ...(input.category !== undefined && { Category: input.category }),
                ...(input.start_date !== undefined && { StartDate: input.start_date }),
                ...(input.end_date !== undefined && { EndDate: input.end_date }),
                ...(input.cursor !== undefined && { PageToken: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const records: z.infer<typeof UsageRecordSchema>[] = [];
        if (providerResponse.usage_records) {
            for (const item of providerResponse.usage_records) {
                const parsed = UsageRecordSchema.parse(item);
                records.push(parsed);
            }
        }

        let nextPageToken: string | undefined;
        if (typeof providerResponse.next_page_uri === 'string') {
            const url = new URL(providerResponse.next_page_uri, 'https://api.twilio.com');
            const token = url.searchParams.get('PageToken');
            if (token) {
                nextPageToken = token;
            }
        }

        return {
            usage_records: records,
            ...(nextPageToken !== undefined && { next_page_token: nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
