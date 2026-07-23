import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customCategoryName: z
        .string()
        .min(1)
        .max(32)
        .regex(/^[^#!@$%^*?./\\]+$/)
        .refine((value) => value.trim() === value, { message: 'must not have leading, trailing, or only whitespace' })
        .describe('Custom category name. Must be 1-32 characters and must not contain: # ! @ $ % ^ * ? . / \\. Example: "RegistrySeedCategory1"'),
    urls: z.array(z.string().min(1)).min(1).describe('URLs to add. Example: ["*.example.com"]')
});

const OutputSchema = z.object({
    customCategoryName: z.string(),
    addedUrls: z.array(z.string())
});

const action = createAction({
    description: 'Add URLs to a custom category; rejects the entire request if any URL is invalid.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedName = encodeURIComponent(input.customCategoryName);

        await nango.post({
            // https://inflight.dope.security/dope.apis/public-api-specification
            endpoint: `/v1/custom_categories/${encodedName}/urls`,
            data: {
                data: {
                    urls: input.urls
                }
            },
            retries: 3
        });

        return {
            customCategoryName: input.customCategoryName,
            addedUrls: input.urls
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
