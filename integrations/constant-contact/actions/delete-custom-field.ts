import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        custom_field_id: z.string().describe('ID of the contact custom field definition to delete. Example: "a1b2c3d4-0000-1111-2222-333344445555"')
    })
    .describe('Input for deleting a contact custom field definition.');

const OutputSchema = z.null().describe('Always null: the provider returns 204 No Content on a successful delete.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a contact custom field definition from the provider account.
 * @pitfalls: The provider's 204 response only confirms the custom field definition itself was deleted; per Constant Contact's documentation, removing the custom_field subresource from every contact it was applied to is a separate step that completes asynchronously afterward, so a contact fetched immediately after this call can still briefly show a value for the deleted field. This deletion cannot be undone. Identify the field by its custom_field_id rather than its name slug, which is silently regenerated whenever the field's label is renamed.
 */
const action = createAction({
    description: 'Delete a contact custom field definition.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input) => {
        // https://v3.developer.constantcontact.com/api_reference/index.html
        await nango.delete({
            endpoint: `/v3/contact_custom_fields/${encodeURIComponent(input.custom_field_id)}`,
            // Retrying is safe: a repeat delete of an already-deleted field only 404s without re-mutating anything.
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
