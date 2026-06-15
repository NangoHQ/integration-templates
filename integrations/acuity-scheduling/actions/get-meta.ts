import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderMetaSchema = z.object({
    hooks: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    hooks: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Retrieve account metadata.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-meta',
        group: 'Meta'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.acuityscheduling.com/reference/meta
            endpoint: '/meta',
            retries: 3
        });

        const providerMeta = ProviderMetaSchema.parse(response.data);

        return {
            ...(providerMeta.hooks !== undefined && { hooks: providerMeta.hooks })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
