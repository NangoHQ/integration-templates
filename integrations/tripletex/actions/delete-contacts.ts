import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ids: z.array(z.number()).min(1).describe('Contact IDs to delete. Example: [11966644, 11966645]')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete one or more contacts by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const idsParam = input.ids.join(',');

        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        await nango.delete({
            endpoint: 'v2/contact/list',
            params: {
                ids: idsParam
            },
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
