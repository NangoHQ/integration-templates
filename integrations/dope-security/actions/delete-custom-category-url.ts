import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customCategoryName: z
        .string()
        .min(1)
        .max(32)
        .regex(/^[^#!@$%^*?./\\]+$/)
        .refine((value) => value.trim() === value, { message: 'must not have leading, trailing, or only whitespace' })
        .describe('Name of the custom category. Must be 1-32 characters and must not contain: # ! @ $ % ^ * ? . / \\. Example: "RegistrySeedCategory1"'),
    url: z.string().min(1).describe('URL to delete from the custom category. Example: "*.registry-seed-test.example.com"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    customCategoryName: z.string(),
    deletedUrl: z.string()
});

const action = createAction({
    description: 'Delete one specific URL from a custom category',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedCategoryName = encodeURIComponent(input.customCategoryName);
        const encodedUrl = encodeURIComponent(input.url);

        await nango.delete({
            // https://inflight.dope.security/dope.apis/public-api-specification
            endpoint: `/v1/custom_categories/${encodedCategoryName}/url/${encodedUrl}`,
            retries: 3
        });

        return {
            success: true,
            customCategoryName: input.customCategoryName,
            deletedUrl: input.url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
