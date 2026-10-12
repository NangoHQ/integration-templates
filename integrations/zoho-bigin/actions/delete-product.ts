import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        record_id: z.string().min(1).describe('The unique ID of the product to delete. Example: "7618134000000646006"')
    })
    .describe('Input for permanently deleting a single Bigin product.');

const ProviderDeleteResultSchema = z.object({
    data: z.array(
        z.object({
            code: z.string(),
            details: z
                .object({
                    id: z.string().optional()
                })
                .optional(),
            message: z.string(),
            status: z.string()
        })
    )
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique ID of the product that was deleted.'),
        status: z.string().describe('Deletion status reported by Bigin, typically "success".'),
        message: z.string().describe('Human-readable confirmation from Bigin, for example "record deleted".')
    })
    .describe('Confirmation that a Bigin product was permanently deleted.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently removes a product record from Bigin through the provider's delete endpoint.
 * @pitfalls: Deleting an already-deleted or nonexistent product ID returns a provider error rather than succeeding silently, and the delete triggers any workflow rules configured on the Products module.
 */
const action = createAction({
    description: 'Permanently delete a single product by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.modules.products.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://www.bigin.com/developer/docs/apis/v2/delete-records.html
            endpoint: `/bigin/v2/Products/${encodeURIComponent(input.record_id)}`,
            // A repeat delete of an already-deleted product returns a 400 error, so a retry after a lost response
            // would report a completed deletion as failed.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderDeleteResultSchema.parse(response.data);
        const result = parsed.data[0];

        if (!result || result.code !== 'SUCCESS' || result.status !== 'success') {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: result?.message ?? 'Bigin did not return a deletion result for the product.',
                record_id: input.record_id,
                ...(result?.code !== undefined && { code: result.code })
            });
        }

        return {
            id: result.details?.id ?? input.record_id,
            status: result.status,
            message: result.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
