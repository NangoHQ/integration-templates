import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        purchaseorder_id: z.string().describe('ID of the draft purchase order to mark as issued. Example: "260815000000155139"'),
        organization_id: z.string().describe('ID of the Zoho Inventory organization that owns the purchase order. Example: "927270289"')
    })
    .describe('Identifies the draft purchase order to issue and the organization that owns it.');

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        success: z.boolean().describe('Whether the purchase order was successfully marked as issued.'),
        purchaseorder_id: z.string().describe('ID of the purchase order that was marked as issued.'),
        message: z.string().describe('Confirmation message returned by Zoho Inventory. Example: "Purchase order status has been changed to Issued."')
    })
    .describe('Result of the purchase order issued transition.');

/**
 * @tags: [write]
 * @tagReason: Transitions a draft purchase order to issued status on the provider.
 * @pitfalls: Re-issuing an already-issued purchase order still returns success, and issuing updates the workflow order_status to issued while the top-level status field can independently show a different fulfillment/receipt state such as received.
 */

const action = createAction({
    description: 'Mark a draft purchase order as issued.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.purchaseorders.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.zoho.com/inventory/api/v1/purchaseorders/#mark-as-issued
            endpoint: `/inventory/v1/purchaseorders/${encodeURIComponent(input.purchaseorder_id)}/status/issued`,
            params: {
                organization_id: input.organization_id
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            success: providerResponse.code === 0,
            purchaseorder_id: input.purchaseorder_id,
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
