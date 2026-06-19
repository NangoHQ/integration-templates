import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    tag_gid: z.string().min(1).describe('The globally unique identifier for the tag. Example: "11235"')
});

const ProviderResponseSchema = z.object({
    data: z.object({}).optional()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a tag by gid.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.asana.com/reference/deletetag
            endpoint: `/api/1.0/tags/${encodeURIComponent(input.tag_gid)}`,
            retries: 3
        });

        ProviderResponseSchema.parse(response.data);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
