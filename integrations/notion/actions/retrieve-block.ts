import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    block_id: z.string().describe('Block ID. Example: "c02fc1d3-db8b-45c5-a222-27595b15aea7"')
});

const ProviderResponseSchema = z
    .object({
        id: z.string(),
        object: z.string(),
        type: z.string(),
        created_time: z.string().optional(),
        last_edited_time: z.string().optional(),
        has_children: z.boolean().optional(),
        in_trash: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string(),
        object: z.literal('block'),
        type: z.string(),
        created_time: z.string().optional(),
        last_edited_time: z.string().optional(),
        has_children: z.boolean().optional(),
        in_trash: z.boolean().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single block by block ID.',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.notion.com/reference/retrieve-a-block
        const response = await nango.get({
            endpoint: `/v1/blocks/${encodeURIComponent(input.block_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Block not found',
                block_id: input.block_id
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);

        return OutputSchema.parse({
            ...parsed,
            object: 'block'
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
