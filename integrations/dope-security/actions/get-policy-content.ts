import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    policyName: z.string().describe('The name of the policy to retrieve content for. Example: "Base Policy"')
});

const CategoryExceptionSchema = z.object({
    restriction: z.string(),
    page: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional()
});

const CategorySettingsSchema = z.object({
    restriction: z.string(),
    page: z.string().optional(),
    description: z.string().optional(),
    exceptions: z.record(z.string(), CategoryExceptionSchema).optional()
});

const CategoryBlockSchema = z.object({
    inheritsFromBase: z.boolean(),
    restrictions: z.record(z.string(), CategorySettingsSchema)
});

const CustomCategorySettingsSchema = z.object({
    restriction: z.string(),
    page: z.string().optional(),
    exceptions: z.record(z.string(), CategoryExceptionSchema).optional()
});

const CustomCategoryBlockSchema = z.object({
    inheritsFromBase: z.boolean(),
    restrictions: z.record(z.string(), CustomCategorySettingsSchema)
});

const ProviderResponseSchema = z.object({
    data: z.object({
        categories: CategoryBlockSchema,
        customCategories: CustomCategoryBlockSchema
    })
});

const OutputSchema = z.object({
    categories: CategoryBlockSchema,
    customCategories: CustomCategoryBlockSchema
});

const action = createAction({
    description: "Retrieve a policy's category and custom-category restrictions, with inheritance state.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://inflight.dope.security/dope.apis/public-api-specification
            endpoint: `/v1/policies/${encodeURIComponent(input.policyName)}/content`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            categories: parsed.data.categories,
            customCategories: parsed.data.customCategories
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
