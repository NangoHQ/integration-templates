import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    story_link_public_id: z.string().describe('The unique public ID of the story link to delete. Example: "500000019"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Remove a link between two stories.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shortcut.com/api/rest/v3#Delete-Story-Link
        await nango.delete({
            endpoint: `/api/v3/story-links/${encodeURIComponent(input.story_link_public_id)}`,
            retries: 1
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
