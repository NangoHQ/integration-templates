import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of items to return per request. Defaults to 20 if not specified. Must be between 1 and 100.'),
    sort: z.string().optional().describe('Sort field. May be prefixed with `-` for descending order. Available fields: `id`, `start`.')
});

const FiscalYearSchema = z.object({
    id: z.number().int().describe('The unique identifier of the fiscal year. Example: 12'),
    start: z.string().describe('The date at which the fiscal year starts. Example: 2023-08-30'),
    finish: z.string().describe('The date at which the fiscal year ends. Example: 2022-12-31'),
    status: z.enum(['open', 'reopen', 'closed', 'frozen']).describe('The status of the fiscal year.'),
    created_at: z.string().describe('The time the fiscal year has been created. Example: 2023-08-30T10:08:08.146343Z'),
    updated_at: z.string().describe('The last time the fiscal year has been updated. Example: 2023-08-30T10:08:08.146343Z')
});

const OutputSchema = z.object({
    items: z.array(FiscalYearSchema),
    next_cursor: z.string().optional().describe('Cursor to retrieve the next set of results.'),
    has_more: z.boolean().describe('Indicates whether additional results are available beyond this set.')
});

const action = createAction({
    description: 'List company fiscal years.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['fiscal_years:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/company-fiscal-years
            endpoint: '/api/external/v2/fiscal_years',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.sort !== undefined && { sort: input.sort })
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            items: z.array(FiscalYearSchema),
            has_more: z.boolean(),
            next_cursor: z.string().nullable()
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items,
            has_more: providerResponse.has_more,
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
