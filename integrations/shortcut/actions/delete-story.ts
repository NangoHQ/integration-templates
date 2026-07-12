import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    storyPublicId: z.number().describe('The unique ID of the Story. Example: 33')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a story.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shortcut.com/api/rest/v3#Delete-Story
        await nango.delete({
            endpoint: `/api/v3/stories/${encodeURIComponent(input.storyPublicId)}`,
            retries: 10
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
