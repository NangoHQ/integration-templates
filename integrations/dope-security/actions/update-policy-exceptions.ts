import { z } from 'zod';
import { createAction } from 'nango';

const ExceptionUpdateSchema = z.object({
    restriction: z.enum(['ALLOW', 'BLOCK', 'WARNING']),
    page: z.string().optional()
});

const CategoryExceptionsSchema = z.record(z.string(), z.record(z.string(), ExceptionUpdateSchema));

const InputSchema = z.object({
    policyName: z.string().describe('Name of the policy to update exceptions for. Example: "RegistrySeedPolicy1"'),
    categories: CategoryExceptionsSchema.optional().describe(
        'Exception updates keyed by category name, then by user or group identifier. Pass an empty object `{}` for a category to remove all exceptions from that category.'
    ),
    customCategories: CategoryExceptionsSchema.optional().describe(
        'Exception updates keyed by custom category name, then by user or group identifier. Pass an empty object `{}` for a category to remove all exceptions from that category.'
    )
});

const ProviderSuccessSchema = z.object({
    message: z.string()
});

const OutputSchema = z.object({
    message: z.string()
});

const action = createAction({
    description: 'Add user/group-level restriction overrides per category; replaces all existing exceptions for the categories/customCategories supplied.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.categories && !input.customCategories) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of categories or customCategories must be provided.'
            });
        }

        const response = await nango.put({
            // https://inflight.dope.security/dope.apis/public-api-specification.md
            endpoint: `/v1/policies/${encodeURIComponent(input.policyName)}/content/exceptions`,
            data: {
                data: {
                    ...(input.categories !== undefined && { categories: input.categories }),
                    ...(input.customCategories !== undefined && { customCategories: input.customCategories })
                }
            },
            retries: 3
        });

        const providerSuccess = ProviderSuccessSchema.parse(response.data);

        return {
            message: providerSuccess.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
