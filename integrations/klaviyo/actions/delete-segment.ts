import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Segment ID. Example: "SRSEt8"')
});

const OutputSchema = z.object({
    id: z.string()
});

const action = createAction({
    description: 'Delete a segment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['segments:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developers.klaviyo.com/en/reference/delete_segment
            endpoint: `/api/segments/${encodeURIComponent(input.id)}`,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        return {
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
