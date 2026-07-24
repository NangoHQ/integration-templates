import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    image_id: z.string().describe('The image ID to delete. Example: "pshDCOusAapn"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete an image.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['images:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://www.typeform.com/developers/create/
            endpoint: `/images/${encodeURIComponent(input.image_id)}`,
            retries: 10
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete image. Status: ${response.status}`
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
