import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const OutputSchema = z.object({
    icons: z.array(z.string())
});

const action = createAction({
    description: 'List valid icon names for leave types.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://timetastic.co.uk/api/
            endpoint: '/leavetypes/icons',
            retries: 3
        });

        const parsed = z.array(z.object({ value: z.string() })).safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse leave type icons response'
            });
        }

        return {
            icons: parsed.data.map((item) => item.value)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
