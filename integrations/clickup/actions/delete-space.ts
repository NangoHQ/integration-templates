import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    space_id: z.string().describe('Space ID to delete. Example: "901511023604"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a space in ClickUp',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-space',
        group: 'Spaces'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.clickup.com/reference/api-spaces/delete-space
        await nango.delete({
            endpoint: `/api/v2/space/${encodeURIComponent(input.space_id)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
