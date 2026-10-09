import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const InputSchema = z
    .object({
        item_id: z.string().describe('ID of the item to mark as active. Example: "260815000000159234"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
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
    scopes: ['ZohoInventory.items.ALL', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        const response = await nango.post({
            // https://www.zoho.com/inventory/api/v1/items/#mark-as-active
            endpoint: `/inventory/v1/items/${encodeURIComponent(input.item_id)}/active`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const result = ProviderResponseSchema.safeParse(response.data);
        if (!result.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when marking item as active.',
                details: result.error.message
            });
        }

        const parsed = result.data;

        if (parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.message,
                code: parsed.code
            });
        }

        return {
            item_id: input.item_id,
            status: 'active',
            message: parsed.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
