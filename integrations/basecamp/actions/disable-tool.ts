import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('Basecamp project ID (bucket ID) containing the dock tool.'),
        toolId: z.number().describe("Dock tool ID to disable. This is the same numeric ID used in the project's dock array.")
    })
    .describe('Input for disabling a Basecamp project dock tool.');

/**
 * @tags: [write]
 * @tagReason: Removes a tool from the project dock without deleting its underlying content; the change is reversible via enable-tool.
 */
const action = createAction({
    description: 'Disable a project dock tool, removing it from the dock without deleting its content (reversible via enable-tool).',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('No content. The tool was successfully disabled from the dock.'),

    exec: async (nango, input): Promise<null> => {
        // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/tools.md
        await nango.delete({
            endpoint: `/buckets/${encodeURIComponent(String(input.projectId))}/recordings/${encodeURIComponent(String(input.toolId))}/position.json`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
