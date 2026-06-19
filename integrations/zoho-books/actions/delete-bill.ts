import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    bill_id: z.string().describe('Bill ID to delete. Example: "260815000000108002"'),
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        )
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
    bill_id: z.string().optional()
});

const ZohoResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive a bill in Zoho Books.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.bills.DELETE', 'ZohoBooks.settings.READ'],

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

        const response = await nango.delete({
            // https://www.zoho.com/books/api/v3/bills/#delete-a-bill
            endpoint: `/books/v3/bills/${encodeURIComponent(input.bill_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const responseData = ZohoResponseSchema.parse(response.data);

        if (responseData.code !== 0) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: responseData.message || 'Failed to delete bill.',
                bill_id: input.bill_id
            });
        }

        return {
            success: true,
            message: responseData.message,
            bill_id: input.bill_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
