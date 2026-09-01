import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the project to move to the trash.')
    })
    .describe('Input for trashing a Basecamp project.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently moves the project to the trash. Trashed projects are auto-deleted after 30 days.
 * @pitfalls: Trashed projects are automatically deleted after 30 days and cannot be recovered through the API.
 */
const action = createAction({
    description: 'Move a project to the trash (recoverable for 30 days, then auto-deleted).',
    version: '1.0.0',
    input: InputSchema,
    output: z.void(),
    scopes: ['write'],

    // @ts-expect-error Nango runtime expects null for z.void() output.
    exec: async (nango, input) => {
        // https://github.com/basecamp/bc3-api/blob/master/sections/projects.md#trash-a-project
        await nango.delete({
            endpoint: `/projects/${encodeURIComponent(String(input.projectId))}.json`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
