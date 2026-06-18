import { z } from 'zod';
import { createAction } from 'nango';

const NumericIdSchema = z.union([z.string(), z.number()]).transform((val) => String(val));

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        ),
    name: z.string().optional().describe('Search items by name. Max-length [100].'),
    filter_by: z.enum(['Status.All', 'Status.Active', 'Status.Inactive']).optional().describe('Filter items by status.'),
    sort_column: z.enum(['name', 'rate', 'tax_name']).optional().describe('Sort items by column.'),
    per_page: z.number().optional().describe('Number of records per page.')
});

const ProviderItemSchema = z.object({
    item_id: NumericIdSchema,
    name: z.string(),
    status: z.string(),
    description: z.string().optional(),
    rate: z.number().optional(),
    unit: z.string().optional(),
    tax_id: NumericIdSchema.optional(),
    tax_name: z.string().optional(),
    tax_percentage: z.union([z.string(), z.number()]).optional(),
    tax_type: z.string().optional(),
    sku: z.string().optional(),
    product_type: z.string().optional(),
    custom_fields: z.array(z.object({}).passthrough()).optional()
});

const ProviderPageContextSchema = z.object({
    page: z.number(),
    per_page: z.number(),
    has_more_page: z.boolean(),
    report_name: z.string().optional(),
    sort_column: z.string().optional(),
    sort_order: z.string().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    items: z.array(ProviderItemSchema),
    page_context: ProviderPageContextSchema
});

const ItemSchema = z.object({
    item_id: z.string(),
    name: z.string(),
    status: z.string(),
    description: z.string().optional(),
    rate: z.number().optional(),
    unit: z.string().optional(),
    tax_id: z.string().optional(),
    tax_name: z.string().optional(),
    tax_percentage: z.string().optional(),
    tax_type: z.string().optional(),
    sku: z.string().optional(),
    product_type: z.string().optional(),
    custom_fields: z.array(z.object({}).passthrough()).optional()
});

const OutputSchema = z.object({
    items: z.array(ItemSchema),
    next_page: z.string().optional().describe('Page number for the next page. Omit if there are no more pages.')
});

const action = createAction({
    description: 'List items from Zoho Books.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Failed to retrieve organizations from Zoho Books.'
                });
            }
            if (!orgData.organizations || orgData.organizations.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            if (orgData.organizations.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_organizations',
                    message: `Multiple organizations found (${orgData.organizations.map((o) => o.organization_id).join(', ')}). Provide organization_id in the action input.`
                });
            }
            const singleOrg = orgData.organizations[0];
            if (!singleOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            organizationId = singleOrg.organization_id;
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid positive integer page number.'
            });
        }

        const params: Record<string, string | number | string[] | number[]> = {
            organization_id: organizationId,
            page: page
        };

        if (input.name !== undefined) {
            params['name'] = input.name;
        }
        if (input.filter_by !== undefined) {
            params['filter_by'] = input.filter_by;
        }
        if (input.sort_column !== undefined) {
            params['sort_column'] = input.sort_column;
        }
        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }

        // https://www.zoho.com/books/api/v3/items/#list-items
        const response = await nango.get({
            endpoint: '/books/v3/items',
            params: params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message,
                code: providerResponse.code
            });
        }

        const items = providerResponse.items.map((item) => ({
            item_id: item.item_id,
            name: item.name,
            status: item.status,
            ...(item.description !== undefined && { description: item.description }),
            ...(item.rate !== undefined && { rate: item.rate }),
            ...(item.unit !== undefined && { unit: item.unit }),
            ...(item.tax_id !== undefined && { tax_id: item.tax_id }),
            ...(item.tax_name !== undefined && { tax_name: item.tax_name }),
            ...(item.tax_percentage !== undefined && { tax_percentage: String(item.tax_percentage) }),
            ...(item.tax_type !== undefined && { tax_type: item.tax_type }),
            ...(item.sku !== undefined && { sku: item.sku }),
            ...(item.product_type !== undefined && { product_type: item.product_type }),
            ...(item.custom_fields !== undefined && { custom_fields: item.custom_fields })
        }));

        return {
            items: items,
            ...(providerResponse.page_context.has_more_page && { next_page: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
