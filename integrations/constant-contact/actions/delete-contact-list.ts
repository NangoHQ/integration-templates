import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        list_id: z.string().describe('ID of the contact list to delete. Example: "c8862818-bc34-11f1-959b-02420a320002"')
    })
    .describe('Input for deleting a contact list.');

const ActivityJobSchema = z.object({
    activity_id: z.string(),
    state: z.string()
});

const OutputSchema = z
    .object({
        activity_id: z
            .string()
            .describe(
                'ID of the asynchronous activity job processing the list deletion. Poll the get-activity action with this ID to confirm completion. Example: "bdf4dc8c-bc34-11f1-bc70-02420a320002"'
            ),
        state: z.string().describe('State of the deletion activity job when the delete request was accepted. Example: "initialized"')
    })
    .describe('Handle of the asynchronous activity job that processes the contact list deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a contact list in Constant Contact, which is a destructive provider mutation.
 * @pitfalls: Deletion is asynchronous: the action returns as soon as the provider accepts a background job, so the list can still exist briefly afterwards; poll get-activity with the returned activity_id to confirm removal. Deleting an unknown or already-deleted list fails with a 400 "list_id not found" error instead of succeeding silently.
 */
const action = createAction({
    description: 'Delete a contact list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://v3.developer.constantcontact.com/api_reference/index.html
        const response = await nango.delete({
            endpoint: `/v3/contact_lists/${encodeURIComponent(input.list_id)}`,
            // Deletion is an asynchronous, non-idempotent background job with no idempotency key: a retry after a lost
            // response could queue a second delete job (or 400 with "list_id not found" if the first already completed),
            // so do not retry.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const activity = ActivityJobSchema.parse(response.data);

        return {
            activity_id: activity.activity_id,
            state: activity.state
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
