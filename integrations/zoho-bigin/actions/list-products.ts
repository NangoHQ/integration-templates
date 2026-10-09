import { z } from 'zod';
import { createAction } from 'nango';

const DEFAULT_FIELDS =
    'id,Product_Name,Product_Code,Product_Category,Description,Unit_Price,Product_Active,$taxable,Owner,Created_By,Modified_By,Created_Time,Modified_Time,Record_Image,Tag,$currency_symbol,$approval_state';

const InputSchema = z
    .object({
        cursor: z
            .string()
            .regex(/^[A-Za-z0-9_-]+$/)
            .optional()
            .describe('Opaque page token returned as `next_cursor` by a previous call. Omit to fetch the first page.'),
        per_page: z
            .number()
            .int()
            .min(1)
            .max(200)
            .optional()
            .describe(
                'Number of products to return per page (1-200). Defaults to 200. Ignored when `cursor` is provided, because the page size is encoded in the token.'
            ),
        sort_by: z.string().min(1).optional().describe('Product field API name to sort by. Example: "Product_Name".'),
        sort_order: z.enum(['asc', 'desc']).optional().describe('Sort direction. Defaults to the provider default ("desc").')
    })
    .describe('Pagination and sorting options for listing Bigin products.');

const ProviderUserSchema = z.object({
    name: z.string().nullable().optional(),
    id: z.string().nullable().optional(),
    email: z.string().nullable().optional()
});

const ProviderTagSchema = z.object({
    name: z.string().nullable().optional(),
    id: z.string().nullable().optional(),
    color_code: z.string().nullable().optional()
});

const ProviderProductSchema = z.object({
    id: z.string(),
    Product_Name: z.string().nullable().optional(),
    Product_Code: z.string().nullable().optional(),
    Product_Category: z.string().nullable().optional(),
    Description: z.string().nullable().optional(),
    Unit_Price: z.number().nullable().optional(),
    Product_Active: z.boolean().nullable().optional(),
    $taxable: z.boolean().nullable().optional(),
    Owner: ProviderUserSchema.nullable().optional(),
    Created_By: ProviderUserSchema.nullable().optional(),
    Modified_By: ProviderUserSchema.nullable().optional(),
    Created_Time: z.string().nullable().optional(),
    Modified_Time: z.string().nullable().optional(),
    Record_Image: z.string().nullable().optional(),
    Tag: z.array(ProviderTagSchema).nullable().optional(),
    $currency_symbol: z.string().nullable().optional(),
    $approval_state: z.string().nullable().optional()
});

const ProviderInfoSchema = z.object({
    next_page_token: z.string().nullable().optional(),
    more_records: z.boolean().nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderProductSchema),
    info: ProviderInfoSchema.optional()
});

const TagSchema = z.object({
    name: z.string().optional().describe('Tag display name.'),
    id: z.string().optional().describe('Unique tag ID.'),
    color_code: z.string().optional().describe('Hex color used to render the tag. Example: "#D4C9FD".')
});

const ProductSchema = z.object({
    id: z.string().describe('Unique Bigin product record ID.'),
    product_name: z.string().optional().describe('Name of the product.'),
    product_code: z.string().optional().describe('Unique product code or SKU.'),
    product_category: z.string().optional().describe('Category the product belongs to.'),
    description: z.string().optional().describe('Product description.'),
    unit_price: z.number().optional().describe('Unit price of the product.'),
    product_active: z.boolean().optional().describe('Whether the product is active.'),
    taxable: z.boolean().optional().describe('Whether the product is taxable.'),
    owner_id: z.string().optional().describe('ID of the user who owns the product record.'),
    owner_name: z.string().optional().describe('Name of the user who owns the product record.'),
    owner_email: z.string().optional().describe('Email of the user who owns the product record.'),
    created_by_id: z.string().optional().describe('ID of the user who created the product.'),
    created_by_name: z.string().optional().describe('Name of the user who created the product.'),
    created_by_email: z.string().optional().describe('Email of the user who created the product.'),
    modified_by_id: z.string().optional().describe('ID of the user who last modified the product.'),
    modified_by_name: z.string().optional().describe('Name of the user who last modified the product.'),
    modified_by_email: z.string().optional().describe('Email of the user who last modified the product.'),
    created_time: z.string().optional().describe('Creation timestamp in ISO 8601 format.'),
    modified_time: z.string().optional().describe('Last modification timestamp in ISO 8601 format.'),
    record_image: z.string().optional().describe('URL of the product image, if any.'),
    currency_symbol: z.string().optional().describe('Currency symbol used for the unit price. Example: "$".'),
    approval_state: z.string().optional().describe('Approval state of the record. Example: "approved".'),
    tags: z.array(TagSchema).optional().describe('Tags applied to the product.')
});

const OutputSchema = z
    .object({
        products: z.array(ProductSchema).describe('Products on the requested page. Empty when the org has no matching products.'),
        next_cursor: z.string().optional().describe('Page token to pass as `cursor` to fetch the next page. Absent when there are no more products.')
    })
    .describe('A page of Bigin products plus the cursor for the next page.');

/**
 * @tags: [read]
 * @tagReason: Reads product records from Bigin and never creates, updates, or deletes provider state.
 * @pitfalls: An empty `products` list with no `next_cursor` is the normal zero-result case (Bigin returns an empty body rather than an error), not a failure. The `cursor` is a short-lived page token that expires, so fetch the next page promptly and only while `next_cursor` is present.
 */
const action = createAction({
    description: 'List products in the Bigin org, paginated.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.modules.products.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            fields: DEFAULT_FIELDS
        };

        if (input.cursor !== undefined) {
            params['page_token'] = input.cursor;
        } else {
            if (input.per_page !== undefined) {
                params['per_page'] = input.per_page;
            }
            if (input.sort_by !== undefined) {
                params['sort_by'] = input.sort_by;
            }
            if (input.sort_order !== undefined) {
                params['sort_order'] = input.sort_order;
            }
        }

        // https://www.bigin.com/developer/docs/apis/v2/get-records.html
        const response = await nango.get({
            endpoint: '/bigin/v2/Products',
            params,
            retries: 3
        });

        if (response.status === 204 || response.data === undefined || response.data === null) {
            return { products: [] };
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from the Bigin Products API.'
            });
        }

        const products = parsed.data.data.map((product) => ({
            id: product.id,
            ...(product.Product_Name != null && { product_name: product.Product_Name }),
            ...(product.Product_Code != null && { product_code: product.Product_Code }),
            ...(product.Product_Category != null && { product_category: product.Product_Category }),
            ...(product.Description != null && { description: product.Description }),
            ...(product.Unit_Price != null && { unit_price: product.Unit_Price }),
            ...(product.Product_Active != null && { product_active: product.Product_Active }),
            ...(product.$taxable != null && { taxable: product.$taxable }),
            ...(product.Owner?.id != null && { owner_id: product.Owner.id }),
            ...(product.Owner?.name != null && { owner_name: product.Owner.name }),
            ...(product.Owner?.email != null && { owner_email: product.Owner.email }),
            ...(product.Created_By?.id != null && { created_by_id: product.Created_By.id }),
            ...(product.Created_By?.name != null && { created_by_name: product.Created_By.name }),
            ...(product.Created_By?.email != null && { created_by_email: product.Created_By.email }),
            ...(product.Modified_By?.id != null && { modified_by_id: product.Modified_By.id }),
            ...(product.Modified_By?.name != null && { modified_by_name: product.Modified_By.name }),
            ...(product.Modified_By?.email != null && { modified_by_email: product.Modified_By.email }),
            ...(product.Created_Time != null && { created_time: product.Created_Time }),
            ...(product.Modified_Time != null && { modified_time: product.Modified_Time }),
            ...(product.Record_Image != null && { record_image: product.Record_Image }),
            ...(product.$currency_symbol != null && { currency_symbol: product.$currency_symbol }),
            ...(product.$approval_state != null && { approval_state: product.$approval_state }),
            ...(product.Tag != null &&
                product.Tag.length > 0 && {
                    tags: product.Tag.map((tag) => ({
                        ...(tag.name != null && { name: tag.name }),
                        ...(tag.id != null && { id: tag.id }),
                        ...(tag.color_code != null && { color_code: tag.color_code })
                    }))
                })
        }));

        const nextCursor = parsed.data.info?.next_page_token;
        return {
            products,
            ...(nextCursor != null && nextCursor !== '' && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
