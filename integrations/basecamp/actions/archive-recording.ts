import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The project (bucket) ID that contains the recording.'),
        recordingId: z.number().describe('The ID of the recording to archive.')
    })
    .describe('Input for archiving a Basecamp recording.');

/**
 * @tags: [write]
 * @tagReason: Updates the recording status to archived via a PUT request.
 * @pitfalls: A 404 response may indicate the account is inactive rather than a missing recording.
 */
const action = createAction({
    description: 'Archive any recording.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Null output indicating the recording was archived successfully.'),
    scopes: [],

    exec: async (nango, input): Promise<null> => {
        // https://github.com/basecamp/bc3-api/blob/master/sections/recordings.md
        await nango.put({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/recordings/${encodeURIComponent(input.recordingId)}/status/archived.json`,
            retries: 3
        });
        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
