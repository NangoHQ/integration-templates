import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        )
});

const ProviderPurchaseOrderSchema = z
    .object({
        purchaseorder_id: z.string(),
        vendor_id: z.string().optional(),
        vendor_name: z.string().optional(),
        status: z.string().optional(),
        purchaseorder_number: z.string().optional(),
        reference_number: z.string().optional(),
        date: z.string().optional(),
        delivery_date: z.string().optional(),
        currency_id: z.string().optional(),
        currency_code: z.string().optional(),
        price_precision: z.coerce.number().optional(),
        total: z.coerce.number().optional(),
        has_attachment: z.boolean().optional(),
        created_time: z.string().optional(),
        last_modified_time: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    purchaseorders: z.array(z.unknown()).optional(),
    page_context: z
        .object({
            page: z.number(),
            per_page: z.number(),
            has_more_page: z.boolean()
        })
        .optional()
});

const OutputSchema = z.object({
    purchaseorders: z.array(ProviderPurchaseOrderSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List purchase orders from Zoho Books.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.purchaseorders.READ', 'ZohoBooks.settings.READ'],

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
                type: 'invalid_cursor',
                message: 'cursor must be a valid positive integer page number.'
            });
        }

        const response = await nango.get({
            // https://www.zoho.com/books/api/v3/purchase-order/#list-purchase-orders
            endpoint: '/books/v3/purchaseorders',
            params: {
                organization_id: organizationId,
                page: String(page),
                per_page: '200'
            },
            retries: 3
        });

        const data = ProviderResponseSchema.parse(response.data);

        if (data.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: data.message,
                code: data.code
            });
        }

        const purchaseorders = z.array(ProviderPurchaseOrderSchema).parse(Array.isArray(data.purchaseorders) ? data.purchaseorders : []);
        const hasMore = data.page_context?.has_more_page === true;

        return {
            purchaseorders,
            ...(hasMore && { next_cursor: String(page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
