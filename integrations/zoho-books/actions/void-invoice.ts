import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    invoice_id: z.string().describe('Invoice ID to void. Example: "260815000000103001"'),
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        )
});

const ProviderVoidResponseSchema = z.object({
    invoice_id: z.string().optional(),
    invoice_number: z.string().optional(),
    status: z.string().optional(),
    message: z.string().optional()
});

const OutputSchema = z.object({
    invoice_id: z.string().optional(),
    invoice_number: z.string().optional(),
    status: z.string().optional(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Void a Zoho Books invoice.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/void-invoice',
        group: 'Invoices'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.invoices.ALL', 'ZohoBooks.settings.READ'],

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

        const response = await nango.post({
            // https://www.zoho.com/books/api/v3/invoices/#void-an-invoice
            endpoint: `/books/v3/invoices/${encodeURIComponent(input.invoice_id)}/status/void`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const providerResponse = ProviderVoidResponseSchema.parse(response.data);

        return {
            ...(providerResponse.invoice_id !== undefined && { invoice_id: providerResponse.invoice_id }),
            ...(providerResponse.invoice_number !== undefined && { invoice_number: providerResponse.invoice_number }),
            ...(providerResponse.status !== undefined && { status: providerResponse.status }),
            ...(providerResponse.message !== undefined && { message: providerResponse.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
