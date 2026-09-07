import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        product_id: z.string().describe('The unique identifier of the product to list variants for.'),
        fields: z.string().optional().describe('Comma-separated list of fields to include in the response.'),
        limit: z.number().min(1).max(250).optional().describe('The number of results to return per page (1-250). Defaults to 50.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        since_id: z.string().optional().describe('Return variants with IDs greater than this value.')
    })
    .describe('Input parameters for listing product variants.');

const VariantSchema = z
    .object({
        id: z.string().describe('The unique identifier for the variant.'),
        product_id: z.string().describe('The ID of the product this variant belongs to.'),
        title: z.string().describe('The title of the variant.'),
        price: z.string().describe('The price of the variant.'),
        sku: z.string().nullable().optional().describe('The SKU (stock keeping unit) of the variant.'),
        position: z.number().nullable().optional().describe("The position of the variant in the product's variant list."),
        inventory_item_id: z.string().nullable().optional().describe('The ID of the inventory item associated with this variant.'),
        created_at: z.string().nullable().optional().describe('The date and time when the variant was created.'),
        updated_at: z.string().nullable().optional().describe('The date and time when the variant was last updated.'),
        option1: z.string().nullable().optional().describe('The value of the first product option.'),
        option2: z.string().nullable().optional().describe('The value of the second product option.'),
        option3: z.string().nullable().optional().describe('The value of the third product option.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        variants: z.array(VariantSchema).describe('Array of product variants returned by the provider.'),
        next_page_info: z.string().optional().describe('Cursor for the next page of results. Absent when there are no more pages.')
    })
    .describe('Response containing product variants and a pagination cursor.');

/**
 * @tags: [read]
 * @tagReason: Reads product variants from the provider.
 */
const action = createAction({
    description: 'List variants for a product.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.cursor !== undefined) {
            params['page_info'] = input.cursor;
        }
        if (input.since_id !== undefined) {
            params['since_id'] = input.since_id;
        }
        if (input.fields !== undefined) {
            params['fields'] = input.fields;
        }

        const response = await nango.get({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/product-variant/get-product-variants
            endpoint: `/admin/openapi/v20260601/products/${encodeURIComponent(input.product_id)}/variants.json`,
            params,
            retries: 3
        });

        const providerResponse = z
            .object({
                variants: z.array(z.unknown())
            })
            .parse(response.data);

        let next_page_info: string | undefined;
        const rawLink = response.headers?.['link'] ?? response.headers?.['Link'];
        if (typeof rawLink === 'string') {
            const nextMatch = rawLink.match(/<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/);
            if (nextMatch && nextMatch[1]) {
                next_page_info = decodeURIComponent(nextMatch[1]);
            }
        }

        return {
            variants: providerResponse.variants.map((variant: unknown) => VariantSchema.parse(variant)),
            ...(next_page_info !== undefined && { next_page_info })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
