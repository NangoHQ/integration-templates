import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Format: page number. Omit for the first page.'),
    per_page: z.number().int().optional().describe('Number of records per page. Default: 200, Max: 200.')
});

const OwnerSchema = z.object({
    name: z.string().nullable().optional(),
    id: z.string().nullable().optional(),
    email: z.string().nullable().optional()
});

const VendorNameSchema = z.object({
    name: z.string().nullable().optional(),
    id: z.string().nullable().optional()
});

const ProductSchema = z.object({
    id: z.string(),
    Product_Name: z.string().nullable().optional(),
    Product_Code: z.string().nullable().optional(),
    Product_Category: z.string().nullable().optional(),
    Product_Active: z.boolean().nullable().optional(),
    Manufacturer: z.string().nullable().optional(),
    Description: z.string().nullable().optional(),
    Unit_Price: z.number().nullable().optional(),
    Usage_Unit: z.string().nullable().optional(),
    Qty_Ordered: z.number().nullable().optional(),
    Qty_in_Stock: z.number().nullable().optional(),
    Qty_in_Demand: z.number().nullable().optional(),
    Sales_Start_Date: z.string().nullable().optional(),
    Sales_End_Date: z.string().nullable().optional(),
    Support_Expiry_Date: z.string().nullable().optional(),
    Support_Start_Date: z.string().nullable().optional(),
    Owner: OwnerSchema.nullable().optional(),
    Vendor_Name: VendorNameSchema.nullable().optional(),
    $currency_symbol: z.string().nullable().optional()
});

const ListOutputSchema = z.object({
    items: z.array(ProductSchema),
    next_cursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown()),
    info: z.object({
        per_page: z.number(),
        count: z.number(),
        page: z.number(),
        more_records: z.boolean()
    })
});

const action = createAction({
    description: 'List products from Zoho CRM',
    version: '1.0.1',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['ZohoCRM.modules.products.READ'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Invalid cursor format. Cursor must be a valid page number.'
            });
        }

        const perPage = input.per_page ?? 200;
        if (perPage < 1 || perPage > 200) {
            throw new nango.ActionError({
                type: 'invalid_per_page',
                message: 'per_page must be between 1 and 200'
            });
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/Products.html
        const response = await nango.get({
            endpoint: '/crm/v2/Products',
            params: {
                page: String(page),
                per_page: String(perPage)
            },
            retries: 3
        });

        // Handle empty response (no products)
        if (!response.data || typeof response.data !== 'object') {
            return {
                items: []
            };
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse Zoho CRM API response',
                details: parsed.error.message
            });
        }

        const items = parsed.data.data.map((item: unknown) => {
            const product = ProductSchema.safeParse(item);
            if (!product.success) {
                throw new nango.ActionError({
                    type: 'invalid_product_data',
                    message: 'Failed to parse product data',
                    details: product.error.message
                });
            }
            return product.data;
        });

        return {
            items,
            ...(parsed.data.info.more_records && { next_cursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
