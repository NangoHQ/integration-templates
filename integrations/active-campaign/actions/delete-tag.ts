import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    tag_id: z.string().describe('Tag ID to delete. Example: "11"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete or archive a tag in ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-tag',
        group: 'Tags'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.activecampaign.com/reference/delete-a-tag
        await nango.delete({
            endpoint: `/3/tags/${encodeURIComponent(input.tag_id)}`,
            retries: 10
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
