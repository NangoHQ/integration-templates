import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('Customer invoice ID. Example: 25461646082048'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of items to return per request. Defaults to 20 if not specified. Must be between 1 and 100.'),
    sort: z.string().optional().describe('Sort field prefixed with `-` for descending order. Available fields: `id`. Example: `-id`.')
});

const CustomHeaderFieldSchema = z.object({
    id: z.number().int(),
    title: z.string(),
    value: z.string().nullable(),
    rank: z.number().int(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderResponseSchema = z.object({
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
    items: z.array(CustomHeaderFieldSchema)
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.number().int(),
            title: z.string(),
            value: z.string().optional(),
            rank: z.number().int(),
            created_at: z.string(),
            updated_at: z.string()
        })
    ),
    has_more: z.boolean(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List custom header fields for a customer invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_invoices:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getcustomerinvoicecustomheaderfields
            endpoint: `/api/external/v2/customer_invoices/${encodeURIComponent(input.id)}/custom_header_fields`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.sort !== undefined && { sort: input.sort })
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response body.'
            });
        }

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            items: providerData.items.map((item) => ({
                id: item.id,
                title: item.title,
                ...(item.value != null && { value: item.value }),
                rank: item.rank,
                created_at: item.created_at,
                updated_at: item.updated_at
            })),
            has_more: providerData.has_more,
            ...(providerData.next_cursor != null && { next_cursor: providerData.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
