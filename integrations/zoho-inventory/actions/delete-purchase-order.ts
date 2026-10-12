import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const InputSchema = z
    .object({
        purchaseorder_id: z.string().describe('Unique identifier of the purchase order to delete. Example: "260815000000160127"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
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
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        // https://www.zoho.com/inventory/api/v1/purchaseorders/#delete-a-purchase-order
        const response = await nango.delete({
            endpoint: `/inventory/v1/purchaseorders/${encodeURIComponent(input.purchaseorder_id)}`,
            params: {
                organization_id: organizationId
            },
            // Deletion is not idempotent: a retry after a lost success reports the already-deleted purchase order as not found.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
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
