import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z
    .object({
        invoice_id: z.string().describe('Unique identifier of the invoice to mark as sent. Example: "260815000000101011"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Identifies the invoice to transition to sent status.');

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        code: z.number().describe('Provider status code; 0 indicates the invoice was marked as sent.'),
        message: z.string().describe('Provider confirmation message, e.g. "Invoice status has been changed to Sent."')
    })
    .describe('Result of the invoice status transition.');

/**
 * @tags: [read, write]
 * @tagReason: Reads the organization list to resolve organization_id when it is omitted, then transitions the invoice to sent.
 * @pitfalls: Marking an invoice as sent does not email it to the customer, and calling the action again on an already-sent invoice succeeds without error.
 */
const action = createAction({
    description: 'Transition a draft invoice to sent status without actually emailing it.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.invoices.CREATE', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/inventory/api/v1/organizations/#list-organizations
                endpoint: '/inventory/v1/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Failed to retrieve organizations from Zoho Inventory.'
                });
            }
            if (!orgData.organizations || orgData.organizations.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Inventory account.'
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
                    message: 'No organizations found for this Zoho Inventory account.'
                });
            }
            organizationId = singleOrg.organization_id;
        }

        const response = await nango.post({
            // https://www.zoho.com/inventory/api/v1/invoices/#mark-an-invoice-as-sent
            endpoint: `/inventory/v1/invoices/${encodeURIComponent(input.invoice_id)}/status/sent`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            code: providerResponse.code,
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
