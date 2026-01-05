import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    block_id: z.string().describe('The ID of the block to update. Example: "2b6ce298-3121-8087-914a-d4fe743f6d69"'),
    paragraph: z.any().optional().describe('Paragraph block content.'),
    heading_1: z.any().optional().describe('Heading 1 block content.'),
    heading_2: z.any().optional().describe('Heading 2 block content.'),
    heading_3: z.any().optional().describe('Heading 3 block content.'),
    bulleted_list_item: z.any().optional().describe('Bulleted list item content.'),
    numbered_list_item: z.any().optional().describe('Numbered list item content.'),
    to_do: z.any().optional().describe('To-do block content.'),
    toggle: z.any().optional().describe('Toggle block content.'),
    code: z.any().optional().describe('Code block content.'),
    callout: z.any().optional().describe('Callout block content.'),
    quote: z.any().optional().describe('Quote block content.')
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    type: z.string(),
    has_children: z.boolean()
});

const action = createAction({
    description: 'Modifies the content of a block based on its type.',
    version: '1.0.0',

    endpoint: {
        method: 'PATCH',
        path: '/blocks/update',
        group: 'Blocks'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const { block_id, ...blockContent } = input;

        const config: ProxyConfiguration = {
            // https://developers.notion.com/reference/update-a-block
            endpoint: `v1/blocks/${block_id}`,
            data: blockContent,
            retries: 3
        };

        const response = await nango.patch(config);
        const data = response.data;

        return {
            id: data.id,
            object: data.object,
            type: data.type,
            has_children: data.has_children
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
