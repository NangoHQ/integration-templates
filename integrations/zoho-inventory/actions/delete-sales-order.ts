import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const InputSchema = z
    .object({
        salesorder_id: z.string().describe('ID of the sales order to delete. Example: "260815000000161134".'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Input for deleting a Zoho Inventory sales order.');

const DeleteResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the sales order was deleted.'),
        salesorder_id: z.string().describe('ID of the deleted sales order.'),
        message: z.string().describe('Confirmation message returned by Zoho Inventory.')
    })
    .describe('Result of deleting a Zoho Inventory sales order.');

/**
 * @tags: [read, write, destructive]
 * @tagReason: Reads the organization list to resolve the organization ID when it is not supplied, and permanently deletes a sales order (write + destructive).
 * @pitfalls: Deletion is permanent and cannot be undone, and the provider refuses it while the sales order has dependent invoices or packages; organization_id is only auto-resolved when the connection has exactly one organization, so pass it explicitly on multi-organization accounts.
 */
const action = createAction({
    description: 'Delete a sales order (only if it has no dependent invoices/packages).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.salesorders.ALL', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        // https://www.zoho.com/inventory/api/v1/salesorders/#delete-a-sales-order
        const response = await nango.delete({
            endpoint: `/inventory/v1/salesorders/${encodeURIComponent(input.salesorder_id)}`,
            params: {
                organization_id: organizationId
            },
            // Deletion is not idempotent: a retry after a lost success reports the already-deleted sales order as not found.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = DeleteResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when deleting a sales order.',
                details: parsed.error.message
            });
        }

        const deleted = parsed.data;

        if (deleted.code !== 0) {
            throw new nango.ActionError({ type: 'provider_error', message: deleted.message, code: deleted.code });
        }

        return {
            success: true,
            salesorder_id: input.salesorder_id,
            message: deleted.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
