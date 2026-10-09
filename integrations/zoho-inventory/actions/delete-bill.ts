import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        bill_id: z.string().describe('ID of the vendor bill to delete. Example: "1234567890"'),
        organization_id: z.string().describe('Zoho Inventory organization ID that owns the bill. Example: "60000000000"')
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
    scopes: ['ZohoInventory.bills.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/inventory/api/v1/bills/
        const response = await nango.delete({
            endpoint: `/inventory/v1/bills/${encodeURIComponent(input.bill_id)}`,
            params: {
                organization_id: input.organization_id
            },
            // Deletion is not idempotent: a retry after a lost success returns a not-found error for the already-deleted bill, so keep retries minimal.
            retries: 1
        });

        const parsed = ProviderDeleteResponseSchema.parse(response.data);

        if (parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: parsed.message,
                bill_id: input.bill_id
            });
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
