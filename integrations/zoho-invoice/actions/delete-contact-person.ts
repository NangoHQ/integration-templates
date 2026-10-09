import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        contact_person_id: z.string().describe('Unique identifier of the contact person to delete. Example: "460000000026051"'),
        organization_id: z.string().describe('ID of the Zoho Invoice organization the contact person belongs to. Example: "10234695"')
    })
    .describe('Identifies the contact person to delete and the Zoho Invoice organization it belongs to.');

const DeleteContactPersonResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when Zoho Invoice confirmed the contact person deletion.'),
        message: z.string().describe('Confirmation message returned by Zoho Invoice. Example: "The contact person has been deleted."')
    })
    .describe('Confirmation that the contact person was deleted, including the message returned by Zoho Invoice.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a contact person through the Zoho Invoice API, permanently removing it from the organization.
 * @pitfalls: Deleting a contact's primary contact person succeeds and leaves the parent contact without any primary contact person; the parent contact is not deleted and no replacement is auto-promoted.
 */
const action = createAction({
    description: 'Delete a contact person.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/invoice/api/v3/contact-persons/#delete-a-contact-person
        const response = await nango.delete({
            endpoint: `/invoice/v3/contacts/contactpersons/${encodeURIComponent(input.contact_person_id)}`,
            params: {
                organization_id: input.organization_id
            },
            // Deleting by target ID is idempotent, so a bounded retry is safe for transient failures.
            retries: 3
        });

        const result = DeleteContactPersonResponseSchema.parse(response.data);

        if (result.code !== 0) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: result.message,
                code: result.code
            });
        }

        return {
            success: true,
            message: result.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
