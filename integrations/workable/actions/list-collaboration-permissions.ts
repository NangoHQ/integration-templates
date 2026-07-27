import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderResponseSchema = z.record(z.string(), z.array(z.string()));

const OutputSchema = z.record(z.string(), z.array(z.string()));

const action = createAction({
    description: 'List which account roles can perform which collaboration actions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_jobs'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://workable.readme.io/reference/collaboration_permissions.md
        const response = await nango.get({
            endpoint: '/spi/v3/collaboration_permissions',
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return providerData;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
