import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const InputSchema = z
    .object({
        bill_id: z.string().describe('ID of the vendor bill to delete. Example: "1234567890"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Identifies the vendor bill to delete and the organization that owns it.');

const ProviderDeleteResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        bill_id: z.string().describe('ID of the bill that was deleted.'),
        success: z.boolean().describe('Whether Zoho confirmed the bill was deleted.'),
        message: z.string().describe('Confirmation message returned by Zoho. Example: "The bill has been deleted."')
    })
    .describe('Confirmation that the vendor bill was deleted.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a vendor bill in the provider; the effect cannot be undone.
 * @pitfalls: Deleting a bill that is already gone or unknown fails with a not-found error instead of succeeding, and Zoho refuses to delete a bill that has payments applied.
 */
const action = createAction({
    description: 'Delete a vendor bill that has no payments applied.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.bills.DELETE', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        // https://www.zoho.com/inventory/api/v1/bills/#delete-a-bill
        const response = await nango.delete({
            endpoint: `/inventory/v1/bills/${encodeURIComponent(input.bill_id)}`,
            params: {
                organization_id: organizationId
            },
            // Deletion is not idempotent: a retry after a lost success reports the already-deleted bill as not found.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const result = ProviderDeleteResponseSchema.safeParse(response.data);
        if (!result.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when deleting a bill.',
                details: result.error.message
            });
        }

        const parsed = result.data;

        if (parsed.code !== 0) {
            throw new nango.ActionError({ type: 'provider_error', message: parsed.message, code: parsed.code });
        }

        return {
            bill_id: input.bill_id,
            success: true,
            message: parsed.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
