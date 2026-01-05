import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    block_id: z.string().describe('The ID of the block or page to append to. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"'),
    children: z.array(z.any()).describe('Array of code block objects.')
});

const OutputSchema = z.object({
    object: z.string(),
    results: z.array(z.any())
});

const action = createAction({
    description: 'Adds a code block with syntax highlighting to a page.',
    version: '1.0.0',

    endpoint: {
        method: 'PATCH',
        path: '/blocks/code',
        group: 'Blocks'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.notion.com/reference/patch-block-children
            endpoint: `v1/blocks/${input.block_id}/children`,
            data: {
                children: input.children
            },
            retries: 3
        };

        const response = await nango.patch(config);
        const data = response.data;

        return {
            object: data.object,
            results: data.results
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
