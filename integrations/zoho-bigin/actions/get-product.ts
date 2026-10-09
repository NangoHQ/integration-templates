import { z } from 'zod';
import { createAction } from 'nango';

const ProductOwnerSchema = z.object({
    id: z.string().describe('Unique ID of the Bigin user. Example: "7618134000000627001"'),
    name: z.string().nullish().describe('Display name of the Bigin user. Example: "Jane Doe"'),
    email: z.string().nullish().describe('Email address of the Bigin user. Example: "jane@example.com"')
});

const ProductTagSchema = z.object({
    id: z.string().describe('Unique ID of the tag. Example: "7618134000000647014"'),
    name: z.string().describe('Display name of the tag. Example: "Priority"'),
    color_code: z.string().nullish().describe('Hex color code assigned to the tag, or null when the tag has no color.')
});

const ProductSchema = z
    .object({
        id: z.string().describe('Unique ID of the product. Example: "7618134000000647002"'),
        Product_Name: z.string().describe('Name of the product. Example: "Wireless Headphones"'),
        Product_Code: z.string().nullish().describe('Internal code or SKU for the product, or null when unset.'),
        Product_Active: z.boolean().nullish().describe('Whether the product is active and available for use, or null when unset.'),
        Product_Category: z.string().nullish().describe('Category assigned to the product, or null when uncategorized.'),
        Unit_Price: z.number().nullish().describe('Unit price of the product, or null when no price is set.'),
        Description: z.string().nullish().describe('Free-text description of the product, or null when empty.'),
        Record_Image: z.string().nullish().describe('URL or reference of the product image, or null when none is set.'),
        Owner: ProductOwnerSchema.nullish().describe('Bigin user who owns the product record, or null when unassigned.'),
        Created_By: ProductOwnerSchema.nullish().describe('Bigin user who created the product record, or null when unavailable.'),
        Modified_By: ProductOwnerSchema.nullish().describe('Bigin user who last modified the product record, or null when unavailable.'),
        Created_Time: z.string().nullish().describe('ISO 8601 timestamp when the product was created. Example: "2026-10-09T22:06:52+03:00"'),
        Modified_Time: z.string().nullish().describe('ISO 8601 timestamp when the product was last modified. Example: "2026-10-09T22:07:26+03:00"'),
        Tag: z.array(ProductTagSchema).nullish().describe('Tags associated with the product, or null when the field is unavailable.')
    })
    .describe('A Bigin product record with its core fields.');

const InputSchema = z
    .object({
        product_id: z.string().min(1).describe('Unique numeric ID of the product to retrieve. Example: "7618134000000647002"')
    })
    .describe('Identifies the Bigin product to retrieve.');

const ProductResponseSchema = z.object({
    data: z.array(ProductSchema)
});

const PRODUCT_FIELDS = [
    'Owner',
    'Product_Name',
    'Product_Code',
    'Product_Active',
    'Product_Category',
    'Created_By',
    'Modified_By',
    'Created_Time',
    'Modified_Time',
    'Unit_Price',
    'Description',
    'Tag',
    'Record_Image'
].join(',');

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing product record from Bigin without creating, updating, or deleting any provider data.
 * @pitfalls: A nonexistent product returns an empty 204 response rather than 404, so this action raises a not_found error instead of returning an empty result; only a fixed subset of product fields is returned, so fields outside the output schema are unavailable.
 */
const action = createAction({
    description: 'Retrieve a single product by its record ID.',
    version: '1.0.0',
    input: InputSchema,
    output: ProductSchema,

    exec: async (nango, input): Promise<z.infer<typeof ProductSchema>> => {
        const response = await nango.get({
            // https://www.bigin.com/developer/docs/apis/v2/get-records.html
            endpoint: `/bigin/v2/Products/${encodeURIComponent(input.product_id)}`,
            params: {
                fields: PRODUCT_FIELDS
            },
            retries: 3
        });

        if (response.status === 204 || !response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Product ${input.product_id} was not found.`,
                product_id: input.product_id
            });
        }

        const parsed = ProductResponseSchema.parse(response.data);
        const product = parsed.data[0];

        if (!product) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Product ${input.product_id} was not found.`,
                product_id: input.product_id
            });
        }

        return product;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
