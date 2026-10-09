import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        creditnote_id: z.string().describe('Unique identifier of the credit note to delete. Example: "260815000000164023"'),
        organization_id: z.string().describe('Identifier of the Zoho Invoice organization that owns the credit note. Example: "927270289"')
    })
    .describe('Identifiers required to delete a Zoho Invoice credit note.');

const ProviderDeleteCreditNoteSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when Zoho Invoice confirmed the credit note was deleted.'),
        message: z.string().describe('Confirmation message returned by Zoho Invoice.')
    })
    .describe('Result of deleting a Zoho Invoice credit note.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes an existing credit note in Zoho Invoice; the deletion cannot be undone through this action.
 * @pitfalls: organization_id must be passed explicitly because it cannot be discovered with this connection's scope. Deleting a credit note that no longer exists raises a not-found error rather than returning success=false.
 */
const action = createAction({
    description: 'Delete a credit note.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.creditnotes.DELETE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/invoice/api/v3/credit-notes
        const response = await nango.delete({
            endpoint: `/invoice/v3/creditnotes/${encodeURIComponent(input.creditnote_id)}`,
            params: {
                organization_id: input.organization_id
            },
            retries: 3
        });

        const providerResponse = ProviderDeleteCreditNoteSchema.parse(response.data);

        return {
            success: providerResponse.code === 0,
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
