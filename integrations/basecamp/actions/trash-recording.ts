import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the Basecamp project (bucket) that contains the recording. Example: 48644099'),
        recordingId: z.number().describe('The ID of the recording to move to the account trash. Example: 10239340934')
    })
    .describe('Input to move a Basecamp recording to the account trash.');

/**
 * @tags: [write, destructive]
 * @tagReason: Moves a recording to the account trash, which is difficult to reverse via the API.
 * @pitfalls: Does not work for projects or Campfire lines; use trash-project and delete-campfire-line respectively.
 */
const action = createAction({
    description: 'Move any recording (to-do, to-do list, message, document, upload, card, column, step, schedule entry, comment, etc.) to the account trash.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('No content returned on success.'),
    scopes: [],

    exec: async (nango, input): Promise<null> => {
        await nango.put({
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/recordings.md
            endpoint: `/buckets/${encodeURIComponent(String(input.projectId))}/recordings/${encodeURIComponent(String(input.recordingId))}/status/trashed.json`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
