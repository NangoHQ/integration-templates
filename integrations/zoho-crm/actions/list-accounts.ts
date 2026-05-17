import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    per_page: z.number().int().min(1).max(200).optional().describe('Number of records to fetch per page. Default is 200. Maximum is 200.'),
    sort_by: z.string().optional().describe('Field name to sort by. Example: "Account_Name"'),
    sort_order: z.enum(['asc', 'desc']).optional().describe('Sort order. Use "asc" for ascending or "desc" for descending.'),
    fields: z.string().optional().describe('Comma-separated list of field API names to include in the response. Maximum 50 fields.')
});

const ProviderInfoSchema = z.object({
    per_page: z.number().int(),
    count: z.number().int(),
    page: z.number().int(),
    sort_by: z.string().optional(),
    sort_order: z.string().optional(),
    more_records: z.boolean(),
    next_page_token: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(z.object({}).passthrough()),
    info: ProviderInfoSchema
});

const OutputSchema = z.object({
    items: z.array(z.object({}).passthrough()),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List accounts from Zoho CRM.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-accounts',
        group: 'Accounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.ALL', 'ZohoCRM.modules.Accounts.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (input.cursor && (isNaN(page) || page < 1)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer representing a page number'
            });
        }

        const params: Record<string, string | number> = {};

        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }
        if (page > 1 || input.cursor) {
            params['page'] = page;
        }
        if (input.sort_by !== undefined) {
            params['sort_by'] = input.sort_by;
        }
        if (input.sort_order !== undefined) {
            params['sort_order'] = input.sort_order;
        }
        if (input.fields !== undefined) {
            params['fields'] = input.fields;
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
        const response = await nango.get({
            endpoint: '/crm/v2/Accounts',
            params,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Provider returned an empty or non-object response'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const nextCursor = providerResponse.info.more_records ? String(page + 1) : undefined;

        return {
            items: providerResponse.data,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
