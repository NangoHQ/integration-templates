import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        view_id: z.number().describe('The ID of the view whose items to list.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        limit: z.number().optional().describe('Maximum number of items to return per page. Defaults to 30.'),
        order_by: z.string().optional().describe('Attribute used to order the items. Examples: created_datetime:asc, updated_datetime:desc.')
    })
    .describe('Input for listing items belonging to a view.');

const OutputSchema = z
    .object({
        items: z.array(z.record(z.string(), z.unknown())).describe('The tickets or customers matching the view filter.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page, if more items exist.')
    })
    .describe('Output containing view items and optional pagination cursor.');

const ProviderResponseSchema = z.object({
    data: z.array(z.record(z.string(), z.unknown())),
    meta: z
        .object({
            current_cursor: z.string().nullable().optional(),
            next_items: z.string().nullable().optional(),
            prev_items: z.string().nullable().optional()
        })
        .optional()
});

/**
 * @tags: [read]
 * @tagReason: Reads view items from the Gorgias API without modifying any data.
 * @pitfalls: Item shape depends on the view type (ticket-list or customer-list); callers should inspect the view type to know which fields to expect.
 */
const action = createAction({
    description: "List the tickets or customers matching a view's saved filter.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['views:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.gorgias.com/reference/list-view-items
            endpoint: `/api/views/${encodeURIComponent(input.view_id)}/items`,
            params: {
                ...(input.cursor && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.order_by && { order_by: input.order_by })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        let nextCursor: string | undefined;
        if (providerResponse.meta?.next_items) {
            const url = new URL(providerResponse.meta.next_items, 'https://example.com');
            const cursor = url.searchParams.get('cursor');
            if (cursor) {
                nextCursor = cursor;
            }
        }

        return {
            items: providerResponse.data,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
