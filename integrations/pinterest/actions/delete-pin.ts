import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pin_id: z.string().describe('The unique identifier of the Pin to delete. Example: "1099300590356452022"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    deleted_pin_id: z.string()
});

const action = createAction({
    description: 'Delete a pin.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pins:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.pinterest.com/docs/api/v5/
            endpoint: `/v5/pins/${encodeURIComponent(input.pin_id)}`,
            retries: 1
        });

        return {
            success: response.status === 204,
            deleted_pin_id: input.pin_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
