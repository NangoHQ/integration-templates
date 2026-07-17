import { z } from 'zod';
import { createAction } from 'nango';

const ProductSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    type: z.string().optional(),
    category: z.string().optional(),
    image_url: z.string().optional(),
    home_url: z.string().optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(20).optional().describe('Number of items to return per page. Maximum 20.'),
    total_required: z.boolean().optional().describe('Indicates whether to include total_items and total_pages in the response.')
});

const OutputSchema = z.object({
    items: z.array(ProductSchema),
    next_cursor: z.string().optional(),
    total_items: z.number().optional(),
    total_pages: z.number().optional()
});

const ProviderLinkSchema = z.object({
    href: z.string(),
    rel: z.string(),
    method: z.string().optional()
});

const ProviderProductSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    type: z.string().optional(),
    category: z.string().optional(),
    image_url: z.string().optional(),
    home_url: z.string().optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional(),
    links: z.array(ProviderLinkSchema).optional()
});

const ProviderResponseSchema = z.object({
    products: z.array(ProviderProductSchema),
    total_items: z.number().optional(),
    total_pages: z.number().optional(),
    links: z.array(ProviderLinkSchema).optional()
});

const action = createAction({
    description: 'List catalog products.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://uri.paypal.com/services/subscriptions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^[1-9]\d*$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer page number.'
            });
        }
        const page = input.cursor !== undefined ? Number(input.cursor) : 1;
        if (page > 100000) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: "cursor must not exceed PayPal's maximum page number of 100000."
            });
        }

        const params: Record<string, string | number> = {
            page: page,
            page_size: input.page_size ?? 20,
            total_required: (input.total_required ?? true) ? 'true' : 'false'
        };

        // https://developer.paypal.com/docs/api/catalog-products/v1/#products_list
        const response = await nango.get({
            endpoint: '/v1/catalogs/products',
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const hasNext = parsed.links?.some((link) => link.rel === 'next') ?? false;
        const next_cursor = hasNext ? String(page + 1) : undefined;

        return {
            items: parsed.products.map((product) => ({
                id: product.id,
                name: product.name,
                ...(product.description !== undefined && { description: product.description }),
                ...(product.type !== undefined && { type: product.type }),
                ...(product.category !== undefined && { category: product.category }),
                ...(product.image_url !== undefined && { image_url: product.image_url }),
                ...(product.home_url !== undefined && { home_url: product.home_url }),
                ...(product.create_time !== undefined && { create_time: product.create_time }),
                ...(product.update_time !== undefined && { update_time: product.update_time })
            })),
            ...(next_cursor !== undefined && { next_cursor }),
            ...(parsed.total_items !== undefined && { total_items: parsed.total_items }),
            ...(parsed.total_pages !== undefined && { total_pages: parsed.total_pages })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
