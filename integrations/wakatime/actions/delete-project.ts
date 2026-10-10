import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        project_id: z
            .string()
            .describe(
                'The WakaTime project ID to permanently delete. Get it from the "id" field returned by the list-projects action. Example: "9a1b2c3d-4e5f-6789-abcd-ef0123456789".'
            )
    })
    .describe('Input for deleting a WakaTime project by its ID.');

const OutputSchema = z.null().describe('Always null. The provider returns no payload for a successful deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a project record from the connected WakaTime account.
 * @pitfalls: Deletion is asynchronous and also deletes the heartbeats recorded under the project, so the project and its heartbeats can remain visible briefly after the call returns; repeating the deletion errors instead of succeeding idempotently.
 */
const action = createAction({
    description: 'Permanently delete a project record by its ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<null> => {
        await nango.delete({
            // Undocumented WakaTime endpoint (not listed at https://wakatime.com/developers); discovered and verified live.
            endpoint: `/api/v1/users/current/projects/${encodeURIComponent(input.project_id)}`,
            // Deleting is not idempotent here: a repeat call returns 400 while the async delete is in flight and 404 once it is gone, so do not retry.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
