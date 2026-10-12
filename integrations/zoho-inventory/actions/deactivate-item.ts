import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const InputSchema = z
    .object({
        item_id: z.string().describe('ID of the item to mark as inactive. Example: "260815000000101002"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Input for marking a Zoho Inventory item as inactive.');

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        code: z.number().describe('Provider result code; 0 indicates the item was marked as inactive.'),
        message: z.string().describe('Provider status message, for example "The variant has been marked as inactive".')
    })
    .describe('Result of marking a Zoho Inventory item as inactive.');

/**
 * @tags: [write]
 * @tagReason: Marks an existing item as inactive via a provider mutation.
 * @pitfalls: Deactivating an already-inactive item still returns success, so a code 0 response does not guarantee the item's status changed; the item is only hidden, not deleted, and can be reactivated.
 */
const action = createAction({
    description: 'Mark an item as inactive, hiding it from default active-only item pickers without deleting it.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.items.ALL', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        // https://www.zoho.com/inventory/api/v1/items/#mark-as-inactive
        const response = await nango.post({
            endpoint: `/inventory/v1/items/${encodeURIComponent(input.item_id)}/inactive`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when marking item as inactive.',
                details: parsed.error.message
            });
        }

        const providerResponse = parsed.data;

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message,
                code: providerResponse.code
            });
        }

        return {
            code: providerResponse.code,
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
