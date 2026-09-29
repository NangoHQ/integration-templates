import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        leadId: z.string().describe('The unique identifier (GUID) of the lead to delete. Example: "389f361d-2bbc-f111-aaad-7ced8d717fa5"')
    })
    .describe('Identifies the lead record to delete.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the lead was deleted successfully.'),
        message: z.string().describe('Human-readable confirmation of the deletion.')
    })
    .describe('Result of the lead deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a lead record through the provider API.
 * @pitfalls: Deletion is immediate and permanent with no soft-delete or recycle bin, and related records may be cascade-deleted depending on the organization's relationship configuration. Deleting an id that does not exist (or was already deleted) fails with a 404 error.
 */
const action = createAction({
    description: 'Delete a lead.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/update-delete-entities-using-web-api
        await nango.delete({
            endpoint: `/api/data/v9.2/leads(${encodeURIComponent(input.leadId)})`,
            // Delete-by-id is idempotent: retrying after a lost response does not repeat the mutation.
            retries: 3
        });

        return {
            success: true,
            message: `Successfully deleted lead with ID ${input.leadId}`
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
