import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        identifier: z.string().describe('Email address or numeric ID of the contact to delete. Examples: "jane.doe@example.com" or "42".')
    })
    .describe('Input for deleting a Brevo contact.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the contact was deleted successfully.'),
        identifier: z.string().describe('The email address or numeric ID of the contact that was deleted.')
    })
    .describe('Result of the delete contact request.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a contact in Brevo.
 * @pitfalls: Brevo responds 204 with an empty body on success, so the output only echoes the input identifier and no deleted record is returned. Deleting an identifier that does not exist fails with a 404. The Brevo account's own registered email contact cannot be deleted (405).
 */
const action = createAction({
    description: 'Delete a contact',
    version: '1.0.0',

    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.brevo.com/reference/deletecontact
        await nango.delete({
            endpoint: `/contacts/${encodeURIComponent(input.identifier)}`,
            retries: 3
        });

        return {
            success: true,
            identifier: input.identifier
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
