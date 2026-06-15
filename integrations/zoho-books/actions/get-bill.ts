import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    bill_id: z.string().describe('The unique ID of the bill to retrieve. Example: "260815000000108002"'),
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        )
});

const ApiResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    bill: z.record(z.string(), z.unknown()).optional()
});

const BillSchema = z
    .object({
        bill_id: z.string(),
        vendor_id: z.string().optional(),
        vendor_name: z.string().optional(),
        status: z.string().optional(),
        bill_number: z.string().optional(),
        date: z.string().optional(),
        due_date: z.string().optional(),
        currency_id: z.string().optional(),
        currency_code: z.string().optional(),
        exchange_rate: z.number().optional(),
        total: z.number().optional(),
        balance: z.number().optional(),
        line_items: z.array(z.object({}).passthrough()).optional()
    })
    .passthrough();

const OutputSchema = BillSchema;

const action = createAction({
    description: 'Retrieve a single bill from Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-bill',
        group: 'Bills'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.bills.READ', 'ZohoBooks.settings.READ'],

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

        const config: ProxyConfiguration = {
            // https://www.zoho.com/books/api/v3/bills/#get-a-bill
            endpoint: `/books/v3/bills/${encodeURIComponent(input.bill_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Zoho Books API.'
            });
        }

        const parsed = ApiResponseSchema.parse(response.data);

        if (parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.message,
                code: parsed.code
            });
        }

        if (!parsed.bill) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Provider did not return a bill object.'
            });
        }

        const bill = BillSchema.parse(parsed.bill);
        return bill;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
