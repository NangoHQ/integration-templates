import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('ID of the Flow to delete. Example: XVTP5Q')
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a flow.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['flows:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developers.klaviyo.com/en/reference/delete_flow
            endpoint: `/api/flows/${encodeURIComponent(input.id)}`,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        return {
            id: input.id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
