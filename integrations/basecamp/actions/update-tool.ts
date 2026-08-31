import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        toolId: z.number().describe('The ID of the dock tool to rename.'),
        title: z.string().describe('The new title for the dock tool.')
    })
    .describe('Input for renaming a Basecamp dock tool.');

const ProviderToolSchema = z.object({
    id: z.number(),
    title: z.string(),
    type: z.string().optional(),
    position: z.number().optional(),
    url: z.string().optional(),
    app_url: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('The ID of the renamed dock tool.'),
        title: z.string().describe('The new title of the dock tool.'),
        type: z.string().optional().describe('The provider type of the dock tool.')
    })
    .describe('Output of the renamed Basecamp dock tool.');

/**
 * @tags: [write]
 * @tagReason: Renames an existing dock tool by updating its title via the provider API.
 * @pitfalls: Renaming works for both enabled and disabled dock tools, but the provider response omits the enabled status, so the output cannot reflect it.
 */
const action = createAction({
    description: 'Rename a dock tool.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://github.com/basecamp/bc3-api/blob/master/sections/tools.md
            endpoint: `/dock/tools/${encodeURIComponent(input.toolId)}.json`,
            data: {
                title: input.title
            },
            retries: 3
        });

        const tool = ProviderToolSchema.parse(response.data);

        return {
            id: tool.id,
            title: tool.title,
            ...(tool.type !== undefined && { type: tool.type })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
