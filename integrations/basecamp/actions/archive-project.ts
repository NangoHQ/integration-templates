import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the project to archive.')
    })
    .describe('Input for archiving a project.');

const OutputSchema = z.null().describe('No content. The project was successfully archived.');

/**
 * @tags: [write]
 * @tagReason: Changes the project status to archived.
 * @pitfalls: On accounts that restrict archiving, only admins or the project creator can archive a project; other users receive 403 Forbidden.
 */
const action = createAction({
    description: 'Archive a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/projects.md
        await nango.put({
            endpoint: `/projects/${encodeURIComponent(input.projectId)}/status/archived.json`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
