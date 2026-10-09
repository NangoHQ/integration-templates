import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z
    .object({
        purchaseorder_id: z.string().describe('Unique identifier of the purchase order to cancel. Example: "260815000000000001"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Input for cancelling a purchase order in Zoho Inventory.');

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        purchaseorder_id: z.string().describe('Unique identifier of the purchase order that was cancelled.'),
        code: z.number().describe('Zoho response code; 0 indicates success.'),
        message: z.string().describe('Human-readable result message returned by Zoho.'),
        cancelled: z.boolean().describe('True when the purchase order was cancelled successfully.')
    })
    .describe('Result of cancelling a purchase order in Zoho Inventory.');

/**
 * @tags: [write, destructive]
 * @tagReason: Cancels the purchase order through a provider mutation, and cancellation is terminal because a voided purchase order can no longer be updated or reopened.
 * @pitfalls: Cancellation is terminal, so a cancelled purchase order cannot be reopened or edited afterward; cancelling an already-cancelled purchase order still succeeds and reports it cancelled, making the call safe to retry.
 */
const action = createAction({
    description: 'Cancel a purchase order in Zoho Inventory.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.purchaseorders.ALL', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            // https://www.zoho.com/inventory/api/v1/organizations/#list-organizations
            const orgResponse = await nango.get({
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

        // https://www.zoho.com/inventory/api/v1/purchaseorders/#cancel-a-purchase-order
        const response = await nango.post({
            endpoint: `/inventory/v1/purchaseorders/${encodeURIComponent(input.purchaseorder_id)}/status/cancelled`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when cancelling purchase order.',
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
            cancelled: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
