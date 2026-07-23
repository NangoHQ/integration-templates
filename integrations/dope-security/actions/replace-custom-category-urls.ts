import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customCategoryName: z
        .string()
        .min(1)
        .max(32)
        .regex(/^[^#!@$%^*?./\\]+$/)
        .describe('Custom category name. Must be 1-32 characters and must not contain: # ! @ $ % ^ * ? . / \\. Example: "RegistrySeedCategory1"'),
    urls: z.array(z.string()).describe('URLs to replace in the category. Example: ["*.example.com", "*.other.com"]')
});

const ProviderSuccessSchema = z.object({
    message: z.string()
});

const OutputSchema = z.object({
    customCategoryName: z.string(),
    urls: z.array(z.string())
});

const action = createAction({
    description: 'Replace all URLs in a custom category',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://inflight.dope.security/dope.apis/public-api-specification
            endpoint: `/v1/custom_categories/${encodeURIComponent(input.customCategoryName)}/urls`,
            data: {
                data: {
                    urls: input.urls
                }
            },
            retries: 3
        });

        // The provider's successful PUT response is just a success message; it
        // does not echo back the URLs, so we return what was requested.
        ProviderSuccessSchema.parse(response.data);

        return {
            customCategoryName: input.customCategoryName,
            urls: input.urls
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
