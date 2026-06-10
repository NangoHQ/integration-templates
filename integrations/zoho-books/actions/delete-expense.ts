import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    expense_id: z.string().describe('The expense ID to delete. Example: "260815000000106001"'),
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive an expense in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-expense',
        group: 'Expenses'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.expenses.DELETE'],

    exec: async (nango, input) => {
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

        const response = await nango.delete({
            // https://www.zoho.com/books/api/v3/expenses/#delete-an-expense
            endpoint: `/books/v3/expenses/${encodeURIComponent(input.expense_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: providerResponse.message || 'Failed to delete expense.'
            });
        }

        return {
            success: true,
            ...(providerResponse.message != null && { message: providerResponse.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
