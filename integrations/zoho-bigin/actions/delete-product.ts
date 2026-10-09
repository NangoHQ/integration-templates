import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        record_id: z.string().describe('The unique ID of the product to delete. Example: "7618134000000646006"')
    })
    .describe('Input for permanently deleting a single Bigin product.');

const ProviderDeleteResultSchema = z.object({
    data: z.array(
        z.object({
            code: z.string(),
            details: z.object({
                id: z.string()
            }),
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
            // Deleting by ID is idempotent: retrying cannot create an extra product deletion.
            retries: 3
        });

        const parsed = ProviderDeleteResultSchema.parse(response.data);
        const result = parsed.data[0];

        if (!result) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Bigin did not return a deletion result for the product.',
                record_id: input.record_id
            });
        }

        return {
            id: result.details.id,
            status: result.status,
            message: result.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
