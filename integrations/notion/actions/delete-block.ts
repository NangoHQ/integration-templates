import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    block_id: z.string().describe('The ID of the block to delete/archive. Example: "12345678-1234-1234-1234-123456789012"')
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    archived: z.boolean()
});

const ProviderBlockSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        archived: z.boolean()
    })
    .passthrough();

const action = createAction({
    description: 'Delete or archive a block by ID.',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_content', 'update_content'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.notion.com/reference/delete-a-block
        const response = await nango.delete({
            endpoint: `/v1/blocks/${encodeURIComponent(input.block_id)}`,
            retries: 3
        });

        const providerBlock = ProviderBlockSchema.parse(response.data);

        return {
            id: providerBlock.id,
            type: providerBlock.type,
            archived: providerBlock.archived
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
