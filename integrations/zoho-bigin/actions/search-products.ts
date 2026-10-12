import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        criteria: z
            .string()
            .optional()
            .describe(
                'COQL-style search criteria in the format ((field_api_name:comparator:value)and/or(...)). Example: "(Product_Name:starts_with:Widget)". Takes precedence over email, phone, and word.'
            ),
        email: z
            .string()
            .optional()
            .describe(
                'Email address to search across the module email fields. Example: "john@example.com". Requires the module to define an email field; Products has none, so this filter fails with a 400.'
            ),
        phone: z
            .string()
            .optional()
            .describe(
                'Phone number to search across the module phone fields. Example: "555-1234". Requires the module to define a phone field; Products has none, so this filter fails with a 400.'
            ),
        word: z.string().min(2).optional().describe('Word to search for across the module. Example: "Widget". Must be at least 2 characters long.'),
        page: z.number().int().optional().describe('Page number of results to return. Default: 1.'),
        per_page: z.number().int().optional().describe('Number of records per page. Default: 200, Max: 200.')
    })
    .describe('Parameters for searching Zoho Bigin products by criteria, email, phone, or word.');

const ActorSchema = z.object({
    name: z.string().nullable().optional().describe('Display name of the user.'),
    id: z.string().nullable().optional().describe('User ID.'),
    email: z.string().nullable().optional().describe('Email address of the user.')
});

const ProductSchema = z
    .object({
        id: z.string().describe('Unique product record ID.'),
        Product_Name: z.string().nullable().optional().describe('Name of the product.'),
        Product_Code: z.string().nullable().optional().describe('Product code or SKU.'),
        Product_Category: z.string().nullable().optional().describe('Category the product belongs to.'),
        Product_Active: z.boolean().nullable().optional().describe('Whether the product is active.'),
        Description: z.string().nullable().optional().describe('Description of the product.'),
        Unit_Price: z.number().nullable().optional().describe('Unit price of the product.'),
        Manufacturer: z.string().nullable().optional().describe('Manufacturer of the product.'),
        Usage_Unit: z.string().nullable().optional().describe('Unit of measure used for the product.'),
        Qty_Ordered: z.number().nullable().optional().describe('Quantity of the product ordered.'),
        Qty_in_Stock: z.number().nullable().optional().describe('Quantity of the product in stock.'),
        Qty_in_Demand: z.number().nullable().optional().describe('Quantity of the product in demand.'),
        Sales_Start_Date: z.string().nullable().optional().describe('Date sales for the product start (YYYY-MM-DD).'),
        Sales_End_Date: z.string().nullable().optional().describe('Date sales for the product end (YYYY-MM-DD).'),
        Support_Start_Date: z.string().nullable().optional().describe('Date support for the product starts (YYYY-MM-DD).'),
        Support_Expiry_Date: z.string().nullable().optional().describe('Date support for the product expires (YYYY-MM-DD).'),
        Owner: ActorSchema.nullable().optional().describe('User who owns the product record.'),
        Created_By: ActorSchema.nullable().optional().describe('User who created the product record.'),
        Modified_By: ActorSchema.nullable().optional().describe('User who last modified the product record.'),
        Created_Time: z.string().nullable().optional().describe('Time the record was created (ISO 8601).'),
        Modified_Time: z.string().nullable().optional().describe('Time the record was last modified (ISO 8601).'),
        Tag: z.array(z.unknown()).nullable().optional().describe('Tags associated with the product record.')
    })
    .passthrough();

const InfoSchema = z.object({
    per_page: z.number().optional().describe('Number of records returned per page.'),
    count: z.number().optional().describe('Number of records returned on this page.'),
    page: z.number().optional().describe('Current page number.'),
    more_records: z.boolean().optional().describe('Whether more records exist beyond this page.')
});

const OutputSchema = z
    .object({
        products: z.array(ProductSchema).describe('Products matching the search. Empty when nothing matched.'),
        page: z.number().optional().describe('Current page number reported by the provider.'),
        per_page: z.number().optional().describe('Number of records per page reported by the provider.'),
        count: z.number().optional().describe('Number of records returned on this page.'),
        more_records: z.boolean().optional().describe('Whether more records exist beyond this page.')
    })
    .describe('Products matching the search plus pagination metadata.');

const ProviderResponseSchema = z.object({
    data: z.array(ProductSchema).optional(),
    info: InfoSchema.optional()
});

/**
 * @tags: [read]
 * @tagReason: Searches and reads product records; performs no provider mutations.
 * @pitfalls: Search results are eventually consistent and can lag 10-20 seconds behind recent creates or updates; word must be at least 2 characters; the email and phone filters always fail because the Products module has no such fields; and a no-match search returns only an empty products list with no pagination fields.
 */
const action = createAction({
    description: 'Search products in Zoho Bigin by criteria, email, phone, or word.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.modules.products.ALL', 'ZohoSearch.securesearch.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.criteria && !input.email && !input.phone && !input.word) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one search filter (criteria, email, phone, or word) must be provided.'
            });
        }

        if (input.page !== undefined && (!Number.isInteger(input.page) || input.page < 1)) {
            throw new nango.ActionError({
                type: 'invalid_page',
                message: 'page must be a positive integer.'
            });
        }

        if (input.per_page !== undefined && (!Number.isInteger(input.per_page) || input.per_page < 1 || input.per_page > 200)) {
            throw new nango.ActionError({
                type: 'invalid_per_page',
                message: 'per_page must be an integer between 1 and 200.'
            });
        }

        const params: Record<string, string | number> = {};

        if (input.criteria) {
            params['criteria'] = input.criteria;
        } else if (input.email) {
            params['email'] = input.email;
        } else if (input.phone) {
            params['phone'] = input.phone;
        } else if (input.word) {
            params['word'] = input.word;
        }

        if (input.page !== undefined) {
            params['page'] = input.page;
        }
        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }

        // https://www.bigin.com/developer/docs/apis/v2/search-records.html
        const response = await nango.get({
            endpoint: '/bigin/v2/Products/search',
            params,
            retries: 3
        });

        if (response.status === 204 || response.data === undefined || response.data === null || response.data === '') {
            return {
                products: []
            };
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse the Zoho Bigin search response.',
                details: parsed.error.message
            });
        }

        const products = parsed.data.data ?? [];

        return {
            products,
            ...(parsed.data.info?.page !== undefined && { page: parsed.data.info.page }),
            ...(parsed.data.info?.per_page !== undefined && { per_page: parsed.data.info.per_page }),
            ...(parsed.data.info?.count !== undefined && { count: parsed.data.info.count }),
            ...(parsed.data.info?.more_records !== undefined && { more_records: parsed.data.info.more_records })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
