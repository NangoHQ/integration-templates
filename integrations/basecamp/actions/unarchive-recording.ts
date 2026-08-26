import { createAction } from 'nango';
import * as z from 'zod';

/**
 * @tags: [write]
 * @tagReason: Restores an archived recording to active status by mutating its provider state.
 * @pitfalls: A 404 response can mean the record is missing, the caller lacks permission, or the account subscription is inactive (check for a Reason: Account Inactive header).
 */
const action = createAction({
    description: 'Restore an archived recording to active',
    version: '1.0.0',
    input: z
        .object({
            projectId: z.string().describe('The ID of the Basecamp project (bucket) containing the recording.'),
            recordingId: z.string().describe('The ID of the recording to restore to active status.')
        })
        .describe('Parameters for restoring an archived recording to active status.'),
    output: z.null().describe('Empty response indicating the recording was restored to active status.'),
    exec: async (nango, input) => {
        // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/recordings.md
        await nango.put({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/recordings/${encodeURIComponent(input.recordingId)}/status/active.json`,
            retries: 3
        });

        return null;
    }
});

export default action;
