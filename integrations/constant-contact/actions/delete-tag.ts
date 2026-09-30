import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        tag_id: z.string().describe('The ID of the contact tag to delete. Example: "d0cea6c8-5d2f-4b1e-9a47-2f1c6a1b2c3d"')
    })
    .describe('Input for deleting a contact tag');

const ActivityJobSchema = z.object({
    activity_id: z.string(),
    state: z.string()
});

const OutputSchema = z
    .object({
        activity_id: z
            .string()
            .describe(
                'ID of the asynchronous activity job processing the tag deletion. Poll the get-activity action with this ID to confirm completion. Example: "338e389e-bc35-11f1-bccd-02420a320002"'
            ),
        state: z.string().describe('State of the deletion activity job when the delete request was accepted. Example: "initialized"')
    })
    .describe('Handle of the asynchronous activity job that processes the contact tag deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a contact tag, which is a destructive provider mutation.
 * @pitfalls: Deletion is asynchronous: the action returns as soon as the provider accepts a background job, so the tag can still exist briefly afterwards; poll get-activity with the returned activity_id to confirm removal.
 */
const action = createAction({
    description: 'Delete a contact tag',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://v3.developer.constantcontact.com/api_reference/index.html (DELETE /v3/contact_tags/{tag_id})
        const response = await nango.delete({
            endpoint: `/v3/contact_tags/${encodeURIComponent(input.tag_id)}`,
            // No idempotency key exists: a retry after a lost response would repeat the delete, so do not retry.
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
