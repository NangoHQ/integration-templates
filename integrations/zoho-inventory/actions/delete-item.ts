import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const InputSchema = z
    .object({
        item_id: z.string().describe('The unique ID of the item to delete. Example: "260815000000103026"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Input for deleting an item from Zoho Inventory.');

const ProviderDeleteResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional()
});

const OutputSchema = z
    .object({
        success: z.boolean().describe('Whether the item was deleted successfully.'),
        item_id: z.string().describe('The ID of the deleted item.'),
        message: z.string().optional().describe('Human-readable status message returned by Zoho Inventory.')
    })
    .describe('Result of deleting an item from Zoho Inventory.');

/**
 * @tags: [read, write, destructive]
 * @tagReason: Reads the organization list to resolve organization_id when it is omitted, then permanently deletes an item.
 * @pitfalls: Deletion is permanent and fails with provider code 2049 if the item is referenced by any transaction, including opening stock or stock adjustments, in which case the API advises marking the item inactive instead; when organization_id is omitted it is only auto-selected if the account has exactly one organization.
 */
const action = createAction({
    description: 'Permanently delete an item that has no transactions associated with it.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.items.ALL', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        // https://www.zoho.com/inventory/api/v1/items/
        const response = await nango.delete({
            endpoint: `/inventory/v1/items/${encodeURIComponent(input.item_id)}`,
            params: {
                organization_id: organizationId
            },
            // A replayed DELETE after a lost response would report the already-deleted item as not found, so it is not retried.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderDeleteResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when deleting item.',
                details: parsed.error.message,
                item_id: input.item_id
            });
        }

        const providerData = parsed.data;

        if (providerData.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerData.message || 'Failed to delete item in Zoho Inventory.',
                code: providerData.code,
                item_id: input.item_id
            });
        }

        return {
            success: true,
            item_id: input.item_id,
            ...(providerData.message != null && { message: providerData.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
