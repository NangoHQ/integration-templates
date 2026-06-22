import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
    id: z.string().optional().describe('Filter by item ID. Example: "basic-plan"'),
    name: z.string().optional().describe('Filter by item name.'),
    type: z.enum(['plan', 'addon', 'charge']).optional().describe('Filter by item type.'),
    item_family_id: z.string().optional().describe('Filter by item family ID. Example: "saas-plans"'),
    status: z.enum(['active', 'archived', 'deleted']).optional().describe('Filter by item status.'),
    updated_at: z
        .object({
            gt: z.string().optional(),
            lt: z.string().optional(),
            gte: z.string().optional(),
            lte: z.string().optional()
        })
        .optional()
        .describe('Filter by updated_at timestamp (Unix epoch seconds).')
});

const ProviderItemSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        resource_version: z.number().optional(),
        updated_at: z.number().optional(),
        item_family_id: z.string().optional(),
        type: z.string().optional(),
        is_giftable: z.boolean().optional(),
        is_shippable: z.boolean().optional(),
        enabled_in_hosted_pages: z.boolean().optional(),
        enabled_in_portal: z.boolean().optional(),
        object: z.string().optional()
    })
    .passthrough();

const ChargebeeListResponseSchema = z.object({
    list: z.array(z.unknown()).optional(),
    next_offset: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderItemSchema),
    next_offset: z.string().optional()
});

const action = createAction({
    description: 'List catalog items (Product Catalog 2.0).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_only'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};

        if (input.cursor !== undefined) {
            params['offset'] = input.cursor;
        }
        if (input.id !== undefined) {
            params['id'] = input.id;
        }
        if (input.name !== undefined) {
            params['name'] = input.name;
        }
        if (input.type !== undefined) {
            params['type[is]'] = input.type;
        }
        if (input.item_family_id !== undefined) {
            params['item_family_id'] = input.item_family_id;
        }
        if (input.status !== undefined) {
            params['status[is]'] = input.status;
        }
        if (input.updated_at !== undefined) {
            if (input.updated_at.gt !== undefined) {
                params['updated_at[after]'] = input.updated_at.gt;
            }
            if (input.updated_at.lt !== undefined) {
                params['updated_at[lt]'] = input.updated_at.lt;
            }
            if (input.updated_at.gte !== undefined) {
                params['updated_at[gte]'] = input.updated_at.gte;
            }
            if (input.updated_at.lte !== undefined) {
                params['updated_at[lte]'] = input.updated_at.lte;
            }
        }

        const response = await nango.get({
            // https://apidocs.chargebee.com/docs/api/items
            endpoint: '/api/v2/items',
            params,
            retries: 3
        });

        const result = ChargebeeListResponseSchema.parse(response.data);

        const items = (result.list || []).map((entry: unknown) => {
            const wrapped = z.object({ item: ProviderItemSchema }).parse(entry);
            return wrapped.item;
        });

        return {
            items,
            ...(result.next_offset !== undefined && { next_offset: result.next_offset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
