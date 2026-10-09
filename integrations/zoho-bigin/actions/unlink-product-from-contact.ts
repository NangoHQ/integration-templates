import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        record_id: z.string().min(1).describe('The unique ID of the Bigin contact record. Example: "7618134000000632028"'),
        product_id: z.string().min(1).describe('The unique ID of the Bigin product record to unlink from the contact. Example: "7618134000000647026"')
    })
    .describe('The contact and product to disassociate.');

const ProviderResponseSchema = z.object({
    data: z
        .array(
            z.object({
                code: z.string(),
                details: z
                    .object({
                        id: z.string()
                    })
                    .optional(),
                message: z.string().optional(),
                status: z.string()
            })
        )
        .optional()
});

const OutputSchema = z
    .object({
        success: z.boolean().describe('Whether the product was successfully unlinked from the contact.'),
        product_id: z.string().min(1).describe('The ID of the product that was unlinked from the contact.'),
        message: z.string().optional().describe('Result message returned by Bigin, for example "relation removed".')
    })
    .describe('The result of removing the product-to-contact association.');

/**
 * @tags: [write]
 * @tagReason: Removes the product-to-contact association in Bigin, mutating provider state while leaving both records intact.
 * @pitfalls: Unlinking a product that is not currently associated with the contact fails with a provider error instead of being a no-op; the contact and product records themselves are never deleted.
 */
const action = createAction({
    description: 'Remove the association between a product and a contact without deleting either record.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.modules.contacts.ALL', 'ZohoBigin.modules.products.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.bigin.com/developer/docs/apis/v2/delink.html
        const response = await nango.delete<unknown>({
            endpoint: `/bigin/v2/Contacts/${encodeURIComponent(input.record_id)}/Products/${encodeURIComponent(input.product_id)}`,
            // Unlinking an absent association returns a 400 error, so a retry after a lost response would report
            // a completed unlink as failed.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const result = parsed.data?.[0];

        if (!result || result.status !== 'success') {
            throw new nango.ActionError({
                type: 'unlink_failed',
                message: result?.message ?? 'Failed to unlink product from contact.',
                record_id: input.record_id,
                product_id: input.product_id
            });
        }

        return {
            success: true,
            product_id: input.product_id,
            ...(result.message != null && { message: result.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
