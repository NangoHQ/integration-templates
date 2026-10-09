import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        creditnote_id: z.string().describe('ID of the credit note to delete. Example: "260815000000163079"'),
        organization_id: z.string().describe('ID of the Zoho Inventory organization the credit note belongs to. Example: "927270289"')
    })
    .describe('Identifies the credit note to delete and the organization it belongs to.');

const DeleteCreditNoteResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when Zoho Inventory confirmed the credit note was deleted.'),
        message: z.string().describe('Confirmation message returned by Zoho Inventory.')
    })
    .describe('Result of the credit note deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes an existing credit note, permanently removing it from the organization.
 * @pitfalls: Deletion is permanently blocked once the credit note has been applied to an invoice or refunded; such an attempt surfaces the provider's error instead of a success:false result, and the block cannot be reversed through this API.
 */
const action = createAction({
    description: 'Delete a credit note that has not been applied to an invoice or refunded.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://www.zoho.com/inventory/api/v1/credit-notes/
            endpoint: `/inventory/v1/creditnotes/${encodeURIComponent(input.creditnote_id)}`,
            params: {
                organization_id: input.organization_id
            },
            // A retry after a lost response would report "does not exist" even though the delete already succeeded.
            retries: 10
        });

        const providerResponse = DeleteCreditNoteResponseSchema.parse(response.data);

        return {
            success: providerResponse.code === 0,
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
