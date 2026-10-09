import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        record_id: z.string().describe('ID of the contact to delete. Example: "7618134000000632028"')
    })
    .describe('Input for permanently deleting a single Bigin contact by ID.');

const ProviderDeleteResultSchema = z.object({
    code: z.string(),
    message: z.string(),
    status: z.string(),
    details: z
        .object({
            id: z.string()
        })
        .optional()
});

const ProviderDeleteResponseSchema = z.object({
    data: z.array(ProviderDeleteResultSchema)
});

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the deleted contact.'),
        success: z.boolean().describe('Whether Bigin confirmed the contact was permanently deleted.'),
        message: z.string().describe('Human-readable deletion result returned by Bigin. Example: "record deleted".')
    })
    .describe('Result of permanently deleting a Bigin contact.');

/**
 * @tags: [write, destructive]
 * @tagReason: Sends a DELETE to the Contacts module, permanently removing the contact record from Bigin.
 * @pitfalls: Deleting a contact also removes its product associations, but the linked products themselves are not deleted; deleting an already-deleted or non-existent contact ID fails with an error rather than succeeding silently.
 */
const action = createAction({
    description: 'Permanently delete a single contact by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.modules.contacts.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.bigin.com/developer/docs/apis/v2/delete-records.html
        // DELETE is naturally idempotent: retrying after a lost response cannot remove additional records.
        const response = await nango.delete({
            endpoint: `/bigin/v2/Contacts/${encodeURIComponent(input.record_id)}`,
            retries: 3
        });

        const parsed = ProviderDeleteResponseSchema.parse(response.data);
        const result = parsed.data[0];

        if (!result || result.code !== 'SUCCESS') {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: result?.message ?? 'Bigin did not confirm the contact deletion.',
                record_id: input.record_id
            });
        }

        return {
            id: result.details?.id ?? input.record_id,
            success: true,
            message: result.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
