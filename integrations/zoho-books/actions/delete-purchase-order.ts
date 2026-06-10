import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    purchaseorder_id: z.string().describe('Unique identifier of the purchase order to delete. Example: "260815000000000001"'),
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z.object({
    purchaseorder_id: z.string(),
    code: z.number(),
    message: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete or archive a purchase order in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-purchase-order',
        group: 'Purchase Orders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.purchaseorders.DELETE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            const firstOrg = orgData.organizations?.[0];
            if (orgData.code !== 0 || !firstOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            organizationId = firstOrg.organization_id;
        }

        // https://www.zoho.com/books/api/v3/purchase-order/#delete-purchase-order
        const response = await nango.delete({
            endpoint: `/books/v3/purchaseorders/${encodeURIComponent(input.purchaseorder_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Books API when deleting purchase order.',
                details: parsed.error.message
            });
        }

        const providerData = parsed.data;

        if (providerData.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerData.message,
                code: providerData.code
            });
        }

        return {
            purchaseorder_id: input.purchaseorder_id,
            code: providerData.code,
            message: providerData.message,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
