import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customCategoryName: z.string().describe('Custom category name. Example: "RegistrySeedCategory1"'),
    urls: z.array(z.string()).describe('URLs to replace in the category. Example: ["*.example.com", "*.other.com"]')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            urls: z.array(z.string()).optional()
        })
        .optional()
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
            retries: 10
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (parsed.success && parsed.data.data && parsed.data.data.urls) {
            return {
                customCategoryName: input.customCategoryName,
                urls: parsed.data.data.urls
            };
        }

        return {
            customCategoryName: input.customCategoryName,
            urls: input.urls
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
