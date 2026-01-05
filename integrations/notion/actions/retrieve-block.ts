import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    block_id: z.string().describe('The ID of the block to retrieve. Example: "2b6ce298-3121-8087-914a-d4fe743f6d69"')
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    type: z.string(),
    has_children: z.boolean(),
    created_time: z.string()
});

const action = createAction({
    description: 'Gets a block object by its ID.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/blocks/get',
        group: 'Blocks'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.notion.com/reference/retrieve-a-block
            endpoint: `v1/blocks/${input.block_id}`,
            retries: 3
        };

        const response = await nango.get(config);
        const data = response.data;

        return {
            id: data.id,
            object: data.object,
            type: data.type,
            has_children: data.has_children,
            created_time: data.created_time
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
