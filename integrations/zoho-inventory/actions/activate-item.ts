import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        item_id: z.string().describe('ID of the item to mark as active. Example: "260815000000159234"'),
        organization_id: z.string().describe('Zoho Inventory organization ID that owns the item. Example: "927270289"')
    })
    .describe('Input for marking an inactive Zoho Inventory item as active.');

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        item_id: z.string().describe('ID of the item that was marked active.'),
        status: z.literal('active').describe('Status of the item after a successful activation.'),
        message: z.string().describe('Confirmation message returned by Zoho Inventory.')
    })
    .describe('Result of marking a Zoho Inventory item as active.');

/**
 * @tags: [write]
 * @tagReason: Mutates the item's status to active in Zoho Inventory.
 * @pitfalls: Activating an already-active item succeeds silently rather than reporting that it was already active, so a successful result does not mean the item was previously inactive; the provider's confirmation message also calls the item a "variant".
 */
const action = createAction({
    description: 'Mark an inactive item as active again in Zoho Inventory.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.items.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.zoho.com/inventory/api/v1/items/#mark-as-active
            endpoint: `/inventory/v1/items/${encodeURIComponent(input.item_id)}/active`,
            params: {
                organization_id: input.organization_id
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            item_id: input.item_id,
            status: 'active',
            message: parsed.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
