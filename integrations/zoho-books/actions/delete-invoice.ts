import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    invoice_id: z.string().describe('The invoice ID to delete. Example: "260815000000101011"'),
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.')
});

const OutputSchema = z.object({
    code: z.number(),
    message: z.string()
});

const action = createAction({
    description: 'Delete or archive an invoice in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-invoice',
        group: 'Invoices'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.invoices.DELETE'],

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

        const response = await nango.delete({
            // https://www.zoho.com/books/api/v3/invoices/#delete-an-invoice
            endpoint: `/books/v3/invoices/${encodeURIComponent(input.invoice_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 1
        });

        const body = z
            .object({
                code: z.number(),
                message: z.string()
            })
            .parse(response.data);

        if (body.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: body.message,
                code: body.code
            });
        }

        return {
            code: body.code,
            message: body.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
