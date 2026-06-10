import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    account_id: z.string().describe('ID of the chart of account to delete. Example: "260815000000000388"'),
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.')
});

const ProviderDeleteResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z.object({
    code: z.number(),
    message: z.string()
});

const action = createAction({
    description: 'Delete a chart of account entry in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-chart-of-account',
        group: 'Chart of Accounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.accountants.ALL', 'ZohoBooks.settings.READ'],

    exec: async (nango, input) => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0 || !orgData.organizations || orgData.organizations.length === 0) {
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

        const response = await nango.delete({
            // https://www.zoho.com/books/api/v3/chartofaccounts/#delete-an-account
            endpoint: `/books/v3/chartofaccounts/${encodeURIComponent(input.account_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const providerData = ProviderDeleteResponseSchema.parse(response.data);

        if (providerData.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerData.message,
                code: providerData.code
            });
        }

        return {
            code: providerData.code,
            message: providerData.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
