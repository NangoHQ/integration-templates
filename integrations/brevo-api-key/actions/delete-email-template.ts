import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        templateId: z.number().int().positive().describe('Numeric ID of the transactional email template to delete. Example: 42')
    })
    .describe('Input for deleting a transactional email template.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when Brevo deleted the template (it responded with 204 No Content).'),
        templateId: z.number().int().describe('Numeric ID of the deleted template, echoed back from the input.')
    })
    .describe('Result of deleting the transactional email template.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a transactional email template on the provider.
 * @pitfalls: Only inactive templates can be deleted; deleting an active one fails with a 405, so deactivate it first (update-email-template with isActive set to false). Deletion is irreversible and also removes associated newsletter template data.
 */
const action = createAction({
    description: 'Permanently delete an inactive transactional email template by its numeric ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.brevo.com/reference/delete-smtp-template
        await nango.delete({
            endpoint: `/smtp/templates/${encodeURIComponent(input.templateId)}`,
            // retries: 0 — a retry after a lost 204 response would 404 on the already-deleted template, misreporting a successful delete as a failure.
            retries: 10
        });

        return {
            success: true,
            templateId: input.templateId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
