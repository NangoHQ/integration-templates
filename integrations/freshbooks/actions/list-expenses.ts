import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountId: z.string()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().min(1).max(100).optional().describe('Number of items per page. Max 100.'),
    date_from: z.string().optional().describe('Filter by start date (YYYY-MM-DD).'),
    date_to: z.string().optional().describe('Filter by end date (YYYY-MM-DD).'),
    updated_since: z.string().optional().describe('Filter by updated since timestamp (YYYY-MM-DDTHH:MM:SS).')
});

const ProviderExpenseSchema = z
    .object({
        id: z.number(),
        amount: z
            .object({
                amount: z.string().optional(),
                code: z.string().optional()
            })
            .optional(),
        date: z.string().optional(),
        staffid: z.number().optional(),
        categoryid: z.number().optional(),
        clientid: z.number().optional(),
        notes: z.string().optional(),
        vis_state: z.number().optional()
    })
    .passthrough();

const ProviderListResponseSchema = z.object({
    response: z.object({
        result: z.object({
            expenses: z.array(z.unknown()),
            page: z.number(),
            pages: z.number(),
            per_page: z.number(),
            total: z.number()
        })
    })
});

const OutputSchema = z.object({
    expenses: z.array(ProviderExpenseSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List expenses.',
    version: '1.0.0',
    metadata: MetadataSchema,
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            throw new nango.ActionError({
                type: 'missing_account_id',
                message: 'account_id is required in connection metadata. Run get-account-id first.'
            });
        }

        const accountId = metadataResult.data.accountId;
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer representing a page number.'
            });
        }

        // https://www.freshbooks.com/api
        const response = await nango.get({
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/expenses/expenses`,
            params: {
                page: String(page),
                per_page: String(input.per_page ?? 100),
                ...(input.date_from && { 'search[date_from]': input.date_from }),
                ...(input.date_to && { 'search[date_to]': input.date_to }),
                ...(input.updated_since && { 'search[updated_since]': input.updated_since })
            },
            retries: 3
        });

        const parsed = ProviderListResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from FreshBooks API.'
            });
        }

        const result = parsed.data.response.result;
        const expenses = result.expenses.map((item) => ProviderExpenseSchema.parse(item));
        const nextCursor = result.page < result.pages ? String(result.page + 1) : undefined;

        return {
            expenses,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
