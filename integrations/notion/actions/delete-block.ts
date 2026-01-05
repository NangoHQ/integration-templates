import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    block_id: z.string()
        .describe('The ID of the block to delete. Example: "2b6ce298-3121-8087-914a-d4fe743f6d69"')
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    archived: z.boolean()
});

const action = createAction({
    description: 'Archives a block, moving it to trash.',
    version: '1.0.0',

    endpoint: {
        method: 'DELETE',
        path: '/blocks/delete',
        group: 'Blocks'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.notion.com/reference/delete-a-block
            endpoint: `v1/blocks/${input.block_id}`,
            retries: 3
        };

        const response = await nango.delete(config);
        const data = response.data;

        return {
            id: data.id,
            object: data.object,
            archived: data.archived
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
