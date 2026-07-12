import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    quote_id: z.string().describe('Quote ID. Example: "25461979840512"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20. Must be between 1 and 100.')
});

const ProviderAppendixSchema = z
    .object({
        id: z.number(),
        url: z.string(),
        filename: z.string(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    items: z.array(ProviderAppendixSchema),
    has_more: z.boolean(),
    next_cursor: z.string().nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderAppendixSchema),
    has_more: z.boolean(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List appendices for a quote.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['quotes:readonly'],

    exec: async (nango, input) => {
        const config: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getquoteappendices
            endpoint: `/api/external/v2/quotes/${encodeURIComponent(input.quote_id)}/appendices`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit })
            },
            retries: 3
        };

        const response = await nango.get(config);

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
