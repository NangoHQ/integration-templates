import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z
    .object({
        purchaseorder_id: z.string().describe('Unique identifier of the purchase order to delete. Example: "260815000000160127"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist. Example: "927270289"'
            )
    })
    .describe('Input for deleting a purchase order in Zoho Inventory.');

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        purchaseorder_id: z.string().describe('Unique identifier of the purchase order that was deleted.'),
        deleted: z.boolean().describe('True when the provider confirmed the purchase order was deleted.'),
        code: z.number().describe('Zoho response code; 0 indicates success.'),
        message: z.string().describe('Human-readable confirmation or error message returned by Zoho.')
    })
    .describe('Result of deleting a purchase order in Zoho Inventory.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a purchase order through the provider's delete endpoint.
 * @pitfalls: Deletion is permanent; it fails with a provider error when the purchase order has dependent bills or receives (unlink those first), and an unknown or already-deleted ID errors instead of being a no-op, while draft, issued, and cancelled purchase orders can all be hard-deleted.
 */
const action = createAction({
    description: 'Delete a purchase order in Zoho Inventory (only when it has no dependent bills or receives).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.purchaseorders.ALL', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/inventory/api/v1/organizations/
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

        // https://www.zoho.com/inventory/api/v1/purchaseorders/
        const response = await nango.delete({
            endpoint: `/inventory/v1/purchaseorders/${encodeURIComponent(input.purchaseorder_id)}`,
            params: {
                organization_id: organizationId
            },
            // A delete is idempotent in effect (a repeat cannot remove more than the first call), so the normal ceiling applies; a retry after a lost success response may surface a spurious "not found" error from Zoho.
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when deleting purchase order.',
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
            deleted: true,
            code: providerData.code,
            message: providerData.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
