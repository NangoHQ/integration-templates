import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        email: z.string().email().describe('Email address of the contact to remove from the list. Example: "jane.doe@example.com"'),
        listId: z.number().int().positive().describe('Numeric ID of the list to remove the contact from. Example: 2')
    })
    .describe('Identifies the contact (by email) and the single list to unsubscribe it from.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the contact is no longer a member of the list.')
    })
    .describe('Result of the unsubscribe request; the provider returns no updated contact details, only an empty success response.');

const HttpErrorSchema = z.object({
    response: z
        .object({
            status: z.number().optional()
        })
        .optional()
});

/**
 * @tags: [write]
 * @tagReason: Removes a contact from a list via a single provider write (PUT with unlinkListIds); it performs no reads and the change is easily reversed by re-adding the contact to the list, so it is not destructive.
 * @pitfalls: Success is returned even if the contact was not a member of the list (a harmless no-op), so a true result does not confirm that anything changed; a contact email that does not exist fails with a not_found error, and no updated contact details are returned.
 */
const action = createAction({
    description:
        'Unsubscribe a contact from a list: removes a single contact, identified by email, from a single list while leaving all other list memberships untouched',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch: converts the provider's 404 for an unknown contact into a clear not_found ActionError instead of a generic HTTP failure
        try {
            // https://developers.brevo.com/reference/updatecontact
            await nango.put({
                endpoint: `/contacts/${encodeURIComponent(input.email)}`,
                data: {
                    unlinkListIds: [input.listId]
                },
                retries: 3
            });
        } catch (err) {
            const parsed = HttpErrorSchema.safeParse(err);
            if (parsed.success && parsed.data.response?.status === 404) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Contact not found',
                    email: input.email
                });
            }
            throw err;
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
