import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Department ID to delete. Example: 248822')
});

const OutputSchema = z.object({
    id: z.number(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a department.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://timetastic.co.uk/api/
            endpoint: `/departments/delete/${encodeURIComponent(String(input.id))}`,
            data: {},
            retries: 3
        };

        await nango.post(config);

        return {
            id: input.id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
