import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const LimitValueSchema = z.object({
    Max: z.number(),
    Remaining: z.number()
});

const ProviderResponseSchema = z.record(z.string(), LimitValueSchema);

const OutputSchema = z.record(
    z.string(),
    z.object({
        max: z.number(),
        remaining: z.number()
    })
);

const action = createAction({
    description: 'Retrieve current org API usage and platform limits',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_limits.htm
        const response = await nango.get({
            endpoint: '/services/data/v60.0/limits',
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const result: Record<string, { max: number; remaining: number }> = {};

        for (const limitName of Object.keys(providerResponse)) {
            const limitData = providerResponse[limitName];
            if (limitData) {
                result[limitName] = {
                    max: limitData.Max,
                    remaining: limitData.Remaining
                };
            }
        }

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
