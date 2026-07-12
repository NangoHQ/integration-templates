import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ledger_entry_line_id: z.string().describe('Ledger entry line ID. Example: "104375831973888"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of items to return per page.')
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    label: z.string().optional(),
    description: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderCategorySchema).optional(),
    next_cursor: z.string().optional().nullable()
});

const OutputSchema = z.object({
    items: z.array(ProviderCategorySchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List categories assigned to a ledger entry line',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/get-ledger-entry-line-categories
            endpoint: `/api/external/v2/ledger_entry_lines/${encodeURIComponent(input.ledger_entry_line_id)}/categories`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from provider',
                details: parsed.error.message
            });
        }

        const data = parsed.data;
        const nextCursor = data.next_cursor != null ? data.next_cursor : undefined;

        return {
            items: data.items || [],
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
