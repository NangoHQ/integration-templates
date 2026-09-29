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
        activity_id: z.string().describe('The ID of the background activity job that performed the tag deletion'),
        state: z.string().describe('The final state of the deletion activity job. "completed" confirms the tag was deleted')
    })
    .describe('Result of the contact tag deletion');

/**
 * @tags: [read, write, destructive]
 * @tagReason: Deletes a contact tag (destructive provider write) and reads the resulting background activity job status until the deletion completes.
 * @pitfalls: Tag deletion runs as an asynchronous background job: the action waits for the job to finish, so the call is not instant and can throw an error if the job fails to complete after the provider accepted the delete.
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

        // Tag deletion is asynchronous: poll the activity job until it reports "completed".
        let state = activity.state;
        const maxAttempts = 10;
        for (let attempt = 0; attempt < maxAttempts && state !== 'completed'; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 250));
            // https://v3.developer.constantcontact.com/api_reference/index.html (GET /v3/activities/{activity_id})
            const statusResponse = await nango.get({
                endpoint: `/v3/activities/${encodeURIComponent(activity.activity_id)}`,
                retries: 3
            });
            const job = ActivityJobSchema.parse(statusResponse.data);
            state = job.state;
        }

        if (state !== 'completed') {
            throw new nango.ActionError({
                type: 'delete_tag_incomplete',
                message: `Tag deletion job did not complete in time; last reported state: ${state}`,
                activity_id: activity.activity_id,
                state
            });
        }

        return {
            activity_id: activity.activity_id,
            state
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
