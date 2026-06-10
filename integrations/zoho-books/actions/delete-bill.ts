import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    bill_id: z.string().describe('Bill ID to delete. Example: "260815000000108002"'),
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.')
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
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-bill',
        group: 'Bills'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.bills.DELETE'],

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
