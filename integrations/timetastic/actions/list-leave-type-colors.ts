import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderColorSchema = z.object({
    value: z.string().nullable(),
    isDark: z.boolean()
});

const OutputSchema = z.object({
    colors: z.array(
        z.object({
            value: z.string().optional(),
            isDark: z.boolean()
        })
    )
});

const action = createAction({
    description: 'List valid color hex codes for leave types.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['leavetypes'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://timetastic.co.uk/api/
            endpoint: '/leavetypes/colors',
            retries: 3
        });

        const providerColors = z.array(ProviderColorSchema).parse(response.data);

        return {
            colors: providerColors.map((color) => ({
                ...(color.value != null && { value: color.value }),
                isDark: color.isDark
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
