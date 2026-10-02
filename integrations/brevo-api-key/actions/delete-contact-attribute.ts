import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        attributeCategory: z
            .enum(['normal', 'transactional', 'category', 'calculated', 'global'])
            .describe('Category of the contact attribute to delete. Allowed values: normal, transactional, category, calculated, global. Example: "normal".'),
        attributeName: z.string().describe('Name of the existing contact attribute to delete. Example: "FAVORITE_COLOR".')
    })
    .describe('Identifies the contact attribute to delete by its category and name.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the contact attribute was deleted successfully.')
    })
    .describe('Result of the contact attribute deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a contact attribute from the account schema, which cannot be undone.
 * @pitfalls: Deletion is permanent and cannot be undone. The attribute must exist in the specified category; a name that exists only in another category returns a 404 error.
 */
const action = createAction({
    description: 'Permanently delete a custom contact attribute from the account schema by category and name.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/delete-attribute
            endpoint: `/contacts/attributes/${encodeURIComponent(input.attributeCategory)}/${encodeURIComponent(input.attributeName)}`,
            // Not retried: a retry after a lost 204 response would 404 on the already-deleted attribute and surface a false failure.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };

        await nango.delete(config);

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
