import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().int().describe('The Basecamp project ID (bucket ID) containing the dock tool.'),
        toolId: z.number().int().describe('The dock tool ID (recording ID) to reposition.'),
        position: z.number().int().describe('The new 1-based position in the dock.')
    })
    .describe('Input to reposition a dock tool within a Basecamp project dock.');

/**
 * @tags: [write]
 * @tagReason: Mutates the dock tool position on the provider.
 * @pitfalls: Basecamp positions are 1-based (position 1 is first), not zero-based; the action returns null with no confirmation of the final position.
 */
const action = createAction({
    description: "Change a dock tool's position in the project dock.",
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Repositioning succeeds with no response body returned by the provider.'),

    exec: async (nango, input): Promise<null> => {
        await nango.put({
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/tools.md
            endpoint: `/buckets/${encodeURIComponent(String(input.projectId))}/recordings/${encodeURIComponent(String(input.toolId))}/position.json`,
            data: {
                position: input.position
            },
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
