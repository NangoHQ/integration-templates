import { z } from 'zod';
import { createAction } from 'nango';

const ListInputSchema = z.object({
    start: z.number().int().min(0).optional().describe('Pagination start. Omit for the first page.'),
    limit: z.number().int().min(1).max(500).optional().describe('Number of items to return per page. Maximum is 500.'),
    owner_id: z.number().int().optional().describe('If supplied, only products owned by the given user will be returned.'),
    filter_id: z.number().int().optional().describe('The ID of the filter to use.'),
    ids: z.string().optional().describe('Comma-separated string array of up to 100 entity IDs to fetch. If filter_id is provided, this is ignored.'),
    sort_by: z.enum(['id', 'name', 'add_time', 'update_time']).optional().describe('The field to sort by. Supported fields: id, name, add_time, update_time.'),
    sort_direction: z.enum(['asc', 'desc']).optional().describe('The sorting direction. Supported values: asc, desc.')
});

const PriceSchema = z.object({
    id: z.number().optional(),
    product_id: z.number().optional(),
    currency: z.string(),
    price: z.number(),
    cost: z.number().optional(),
    overhead_cost: z.number().optional(),
    price_formatted: z.string().optional()
});

const OwnerSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    has_pic: z.number().optional(),
    pic_hash: z.string().optional().nullable(),
    active_flag: z.boolean().optional(),
    value: z.number()
});

const ProductSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        code: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        unit: z.string().optional().nullable(),
        tax: z.number().optional().nullable(),
        category: z.number().optional().nullable(),
        active_flag: z.boolean().optional().nullable(),
        selectable: z.boolean().optional().nullable(),
        visible_to: z.union([z.number(), z.string()]).optional().nullable(),
        owner_id: z.union([z.number(), OwnerSchema]).optional().nullable(),
        add_time: z.string().optional().nullable(),
        update_time: z.string().optional().nullable(),
        prices: z.array(PriceSchema).optional().nullable()
    })
    .passthrough();

const ListOutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            code: z.string().optional(),
            description: z.string().optional(),
            unit: z.string().optional(),
            tax: z.number().optional(),
            category: z.number().optional(),
            active_flag: z.boolean().optional(),
            selectable: z.boolean().optional(),
            visible_to: z.union([z.number(), z.string()]).optional(),
            owner_id: z.union([z.number(), z.object({}).passthrough()]).optional(),
            add_time: z.string().optional(),
            update_time: z.string().optional(),
            prices: z.array(PriceSchema).optional()
        })
    ),
    next_start: z.number().optional()
});

const action = createAction({
    description: 'List products from Pipedrive.',
    version: '1.0.1',
    input: ListInputSchema,
    output: ListOutputSchema,
    scopes: ['products:read'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        // https://developers.pipedrive.com/docs/api/v1/Products#getProducts
        const response = await nango.get({
            endpoint: '/v1/products',
            params: {
                ...(input.start !== undefined && { start: String(input.start) }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.owner_id !== undefined && { user_id: String(input.owner_id) }),
                ...(input.filter_id !== undefined && { filter_id: String(input.filter_id) }),
                ...(input.ids !== undefined && { ids: input.ids }),
                ...(input.sort_by !== undefined && { sort_by: input.sort_by }),
                ...(input.sort_direction !== undefined && { sort_direction: input.sort_direction })
            },
            retries: 3
        });

        if (!response.data || !response.data.success) {
            throw new nango.ActionError({
                type: 'api_error',
                message: response.data?.error || 'Failed to list products from Pipedrive'
            });
        }

        const products = (response.data.data || []).map((product: unknown) => {
            const parsed = ProductSchema.parse(product);
            return {
                id: String(parsed.id),
                name: parsed.name,
                ...(parsed.code !== undefined && parsed.code !== null && { code: parsed.code }),
                ...(parsed.description !== undefined && parsed.description !== null && { description: parsed.description }),
                ...(parsed.unit !== undefined && parsed.unit !== null && { unit: parsed.unit }),
                ...(parsed.tax !== undefined && parsed.tax !== null && { tax: parsed.tax }),
                ...(parsed.category !== undefined && parsed.category !== null && { category: parsed.category }),
                ...(parsed.active_flag !== undefined && parsed.active_flag !== null && { active_flag: parsed.active_flag }),
                ...(parsed.selectable !== undefined && parsed.selectable !== null && { selectable: parsed.selectable }),
                ...(parsed.visible_to !== undefined && parsed.visible_to !== null && { visible_to: parsed.visible_to }),
                ...(parsed.owner_id !== undefined && parsed.owner_id !== null && { owner_id: parsed.owner_id }),
                ...(parsed.add_time !== undefined && parsed.add_time !== null && { add_time: parsed.add_time }),
                ...(parsed.update_time !== undefined && parsed.update_time !== null && { update_time: parsed.update_time }),
                ...(parsed.prices !== undefined && parsed.prices !== null && { prices: parsed.prices })
            };
        });

        const additionalData = response.data.additional_data || {};
        const pagination = additionalData?.pagination || {};
        const nextStart = pagination?.more_items_in_collection ? (pagination?.start || 0) + (pagination?.limit || 100) : undefined;

        return {
            items: products,
            ...(nextStart !== undefined && { next_start: nextStart })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
