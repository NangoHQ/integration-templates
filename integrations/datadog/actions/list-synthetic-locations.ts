import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const LocationSchema = z.object({
    id: z.string(),
    name: z.string()
});

const OutputSchema = z.object({
    locations: z.array(LocationSchema)
});

const action = createAction({
    description: 'List available public and private Synthetic test locations.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/synthetics/#get-all-locations-public-and-private
            endpoint: 'v1/synthetics/locations',
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
