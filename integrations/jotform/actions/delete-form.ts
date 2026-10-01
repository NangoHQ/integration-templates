import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The ID of the form to delete. Example: "262715780901055".')
    })
    .describe('Identifies the Jotform form to delete.');

const OutputSchema = z
    .object({
        id: z.string().describe('The ID of the deleted form. Example: "262715780901055".'),
        status: z.string().describe('The status of the form after deletion. Always "DELETED" on success; the form record itself remains retrievable.')
    })
    .describe('Confirmation that the form was marked as deleted.');

const ProviderDeleteFormSchema = z.object({
    content: z.object({
        id: z.string(),
        status: z.string()
    })
});

/**
 * @tags: [write, destructive]
 * @tagReason: Marks a form as deleted through the provider API; the effect is hard to reverse through this API even though the record is not scrubbed.
 * @pitfalls: Deletion is soft: the form record remains retrievable with status DELETED rather than being permanently scrubbed. Deleting an already-deleted form succeeds again without error, so callers cannot distinguish a fresh delete from a repeat. A form ID that does not exist fails with a 401 authorization error instead of a not-found error.
 */
const action = createAction({
    description: 'Delete a form. Jotform marks it DELETED rather than permanently scrubbing the record.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.jotform.com/docs/ (DELETE /form/{id})
            endpoint: `/form/${encodeURIComponent(input.id)}`,
            retries: 3 // DELETE is idempotent here: re-deleting an already-deleted form returns the same 200 DELETED response.
        };

        const response = await nango.delete(config);

        const deletedForm = ProviderDeleteFormSchema.parse(response.data);

        return {
            id: deletedForm.content.id,
            status: deletedForm.content.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
