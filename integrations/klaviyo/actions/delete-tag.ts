import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    tag_id: z.string().describe('The tag ID to delete. Example: "aa27b1b8-9198-47da-86bf-3f6196d4c074"')
});

const OutputSchema = z.object({
    id: z.string()
});

const action = createAction({
    description: 'Delete a tag.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tags:read', 'tags:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.klaviyo.com/en/reference/delete_tag
        await nango.delete({
            endpoint: `/api/tags/${encodeURIComponent(input.tag_id)}`,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        return {
            id: input.tag_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
