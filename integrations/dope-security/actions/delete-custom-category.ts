import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customCategoryName: z
        .string()
        .min(1)
        .max(32)
        .regex(/^[^#!@$%^*?./\\]+$/)
        .describe(
            'The name of the custom category to delete. Must be 1-32 characters and must not contain: # ! @ $ % ^ * ? . / \\. Example: "RegistrySeedCategory2"'
        )
});

const OutputSchema = z.object({
    success: z.boolean(),
    customCategoryName: z.string()
});

const action = createAction({
    description: 'Delete a custom category and its associated data.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://inflight.dope.security/dope.apis/public-api-specification
            endpoint: `/v1/custom_categories/${encodeURIComponent(input.customCategoryName)}`,
            retries: 3
        });

        return {
            success: true,
            customCategoryName: input.customCategoryName
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
