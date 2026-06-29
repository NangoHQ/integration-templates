import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    product_id: z.number().describe('Product ID. Example: 192'),
    page: z.number().optional().describe('Page number for pagination. Defaults to 1.'),
    limit: z.number().optional().describe('Number of items per page. Defaults to 50.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const OptionValueSchema = z.object({
    id: z.number(),
    label: z.string(),
    option_id: z.number(),
    option_display_name: z.string()
});

const ProviderVariantSchema = z.object({
    id: z.number(),
    product_id: z.number(),
    sku: z.string(),
    sku_id: z.number().nullable().optional(),
    price: z.number().nullable().optional(),
    calculated_price: z.number().optional(),
    sale_price: z.number().nullable().optional(),
    retail_price: z.number().nullable().optional(),
    map_price: z.union([z.number(), z.object({}).passthrough(), z.null()]).optional(),
    weight: z.number().nullable().optional(),
    calculated_weight: z.number().optional(),
    width: z.number().nullable().optional(),
    height: z.number().nullable().optional(),
    depth: z.number().nullable().optional(),
    is_free_shipping: z.boolean().optional(),
    fixed_cost_shipping_price: z.number().nullable().optional(),
    purchasing_disabled: z.boolean().optional(),
    purchasing_disabled_message: z.string().optional(),
    image_url: z.string().optional(),
    cost_price: z.number().optional(),
    upc: z.string().nullable().optional(),
    mpn: z.string().nullable().optional(),
    gtin: z.string().nullable().optional(),
    inventory_level: z.number().nullable().optional(),
    inventory_warning_level: z.number().nullable().optional(),
    bin_picking_number: z.string().nullable().optional(),
    option_values: z.array(OptionValueSchema).optional()
});

const ProviderPaginationLinksSchema = z.object({
    next: z.string().optional(),
    previous: z.string().optional(),
    current: z.string().optional()
});

const ProviderPaginationMetaSchema = z.object({
    total: z.number().optional(),
    count: z.number().optional(),
    per_page: z.number().optional(),
    current_page: z.number().optional(),
    total_pages: z.number().optional(),
    links: ProviderPaginationLinksSchema.optional()
});

const ProviderMetaSchema = z.object({
    pagination: ProviderPaginationMetaSchema.optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderVariantSchema).optional(),
    meta: ProviderMetaSchema.optional()
});

const VariantOutputSchema = z.object({
    id: z.number(),
    product_id: z.number(),
    sku: z.string(),
    sku_id: z.number().optional(),
    price: z.number().optional(),
    calculated_price: z.number().optional(),
    sale_price: z.number().optional(),
    retail_price: z.number().optional(),
    map_price: z.union([z.number(), z.object({}).passthrough()]).optional(),
    weight: z.number().optional(),
    calculated_weight: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    depth: z.number().optional(),
    is_free_shipping: z.boolean().optional(),
    fixed_cost_shipping_price: z.number().optional(),
    purchasing_disabled: z.boolean().optional(),
    purchasing_disabled_message: z.string().optional(),
    image_url: z.string().optional(),
    cost_price: z.number().optional(),
    upc: z.string().optional(),
    mpn: z.string().optional(),
    gtin: z.string().optional(),
    inventory_level: z.number().optional(),
    inventory_warning_level: z.number().optional(),
    bin_picking_number: z.string().optional(),
    option_values: z
        .array(
            z.object({
                id: z.number(),
                label: z.string(),
                option_id: z.number(),
                option_display_name: z.string()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    variants: z.array(VariantOutputSchema),
    next_page: z.string().optional()
});

const action = createAction({
    description: 'List variants for a product.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_products_read_only'],
    endpoint: {
        path: '/actions/list-product-variants',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const parsedPage = input.cursor ? Number(input.cursor) : (input.page ?? 1);
        if (!Number.isInteger(parsedPage) || parsedPage < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Invalid page or cursor value. Must be a positive integer.'
            });
        }
        const page = parsedPage;

        const limit = input.limit ?? 50;

        // https://developer.bigcommerce.com/docs/rest-catalog/product-variants
        const response = await nango.get({
            endpoint: `/v3/catalog/products/${encodeURIComponent(String(input.product_id))}/variants`,
            params: {
                page: String(page),
                limit: String(limit)
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const variants = providerResponse.data ?? [];

        const pagination = providerResponse.meta?.pagination;
        const nextLink = pagination?.links?.next;
        let nextPage: string | undefined;
        if (nextLink) {
            const match = nextLink.match(/[?&]page=(\d+)/);
            if (match) {
                nextPage = match[1];
            }
        }

        const normalizedVariants = variants.map((variant) => {
            const normalizedMapPrice =
                variant.map_price === null || variant.map_price === undefined
                    ? undefined
                    : typeof variant.map_price === 'number'
                      ? variant.map_price
                      : variant.map_price;

            return {
                id: variant.id,
                product_id: variant.product_id,
                sku: variant.sku,
                ...(variant.sku_id !== undefined && variant.sku_id !== null && { sku_id: variant.sku_id }),
                ...(variant.price !== undefined && variant.price !== null && { price: variant.price }),
                ...(variant.calculated_price !== undefined && { calculated_price: variant.calculated_price }),
                ...(variant.sale_price !== undefined && variant.sale_price !== null && { sale_price: variant.sale_price }),
                ...(variant.retail_price !== undefined && variant.retail_price !== null && { retail_price: variant.retail_price }),
                ...(normalizedMapPrice !== undefined && { map_price: normalizedMapPrice }),
                ...(variant.weight !== undefined && variant.weight !== null && { weight: variant.weight }),
                ...(variant.calculated_weight !== undefined && { calculated_weight: variant.calculated_weight }),
                ...(variant.width !== undefined && variant.width !== null && { width: variant.width }),
                ...(variant.height !== undefined && variant.height !== null && { height: variant.height }),
                ...(variant.depth !== undefined && variant.depth !== null && { depth: variant.depth }),
                ...(variant.is_free_shipping !== undefined && { is_free_shipping: variant.is_free_shipping }),
                ...(variant.fixed_cost_shipping_price !== undefined &&
                    variant.fixed_cost_shipping_price !== null && {
                        fixed_cost_shipping_price: variant.fixed_cost_shipping_price
                    }),
                ...(variant.purchasing_disabled !== undefined && { purchasing_disabled: variant.purchasing_disabled }),
                ...(variant.purchasing_disabled_message !== undefined && { purchasing_disabled_message: variant.purchasing_disabled_message }),
                ...(variant.image_url !== undefined && { image_url: variant.image_url }),
                ...(variant.cost_price !== undefined && { cost_price: variant.cost_price }),
                ...(variant.upc !== undefined && variant.upc !== null && { upc: variant.upc }),
                ...(variant.mpn !== undefined && variant.mpn !== null && { mpn: variant.mpn }),
                ...(variant.gtin !== undefined && variant.gtin !== null && { gtin: variant.gtin }),
                ...(variant.inventory_level !== undefined && variant.inventory_level !== null && { inventory_level: variant.inventory_level }),
                ...(variant.inventory_warning_level !== undefined &&
                    variant.inventory_warning_level !== null && {
                        inventory_warning_level: variant.inventory_warning_level
                    }),
                ...(variant.bin_picking_number !== undefined &&
                    variant.bin_picking_number !== null && {
                        bin_picking_number: variant.bin_picking_number
                    }),
                ...(variant.option_values !== undefined && {
                    option_values: variant.option_values.map((opt) => ({
                        id: opt.id,
                        label: opt.label,
                        option_id: opt.option_id,
                        option_display_name: opt.option_display_name
                    }))
                })
            };
        });

        return {
            variants: normalizedVariants,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
