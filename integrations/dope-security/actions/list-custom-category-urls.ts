import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customCategoryName: z.string().describe('Name of the custom category. Example: "RegistrySeedCategory1"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        urls: z.array(z.string())
    })
});

const OutputSchema = z.object({
    urls: z.array(z.string())
});

const action = createAction({
    description: 'List all URLs in a custom category.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://inflight.dope.security/dope.apis/public-api-specification
            endpoint: `/v1/custom_categories/${encodeURIComponent(input.customCategoryName)}/urls`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            urls: providerResponse.data.urls
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
