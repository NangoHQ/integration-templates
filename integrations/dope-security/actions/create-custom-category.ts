import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z
        .string()
        .min(1)
        .max(32)
        .regex(/^[^#!@$%^*?./\\]+$/)
        .describe('Custom category name. Must be 1-32 characters and must not contain: # ! @ $ % ^ * ? . / \\. Example: "MyCategory"')
});

const ProviderSuccessSchema = z.object({
    message: z.string()
});

const OutputSchema = z.object({
    message: z.string()
});

const action = createAction({
    description: 'Create a custom category.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://inflight.dope.security/dope.apis/public-api-specification.md
            endpoint: `/v1/custom_categories/${encodeURIComponent(input.name)}`,
            data: {},
            retries: 3
        });

        const providerResponse = ProviderSuccessSchema.parse(response.data);

        return {
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
