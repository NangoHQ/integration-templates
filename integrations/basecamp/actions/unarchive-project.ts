import { createAction } from 'nango';
import * as z from 'zod';

const InputSchema = z
    .object({
        projectId: z.number().describe('The unique numeric ID of the project to restore.')
    })
    .describe('Input for restoring a Basecamp project to active.');

const OutputSchema = z.null().describe('Empty success response returned when the project is restored to active.');

/**
 * @tags: [write]
 * @tagReason: Mutates the project status by restoring it from archive or trash to active.
 * @pitfalls: Returns 507 Insufficient Storage when the account is over its project limit; the project remains archived/trashed until the plan is upgraded.
 */
const action = createAction({
    description: 'Restore a project from the archive or trash back to active.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // https://github.com/basecamp/bc3-api/blob/master/sections/projects.md
        await nango.put({
            endpoint: `/projects/${encodeURIComponent(input.projectId)}/status/active.json`,
            retries: 3
        });

        return null;
    }
});

export default action;
