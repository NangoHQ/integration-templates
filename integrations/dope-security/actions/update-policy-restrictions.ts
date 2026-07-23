import { z } from 'zod';
import { createAction } from 'nango';

const RestrictionValue = z.enum(['ALLOW', 'BLOCK', 'WARNING']);

const InputSchema = z.object({
    policyName: z
        .string()
        .min(1)
        .max(32)
        .regex(/^[^#!@$%^*?./\\]+$/)
        .describe('Policy name. Max 32 characters, no special characters (#!@$%^*?./\\). Example: "RegistrySeedPolicy1"'),
    categories: z.record(z.string(), RestrictionValue).describe('Map of category names to restriction values.')
});

const ProviderSuccessSchema = z.object({
    message: z.string()
});

const OutputSchema = z.object({
    policyName: z.string(),
    categories: z
        .record(
            z.string(),
            z.object({
                restriction: z.string()
            })
        )
        .optional()
});

const action = createAction({
    description: "Update a policy's category restrictions (ALLOW/BLOCK/WARNING), or reset to base inheritance.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mappedCategories: Record<string, { restriction: string }> = {};
        for (const [name, restriction] of Object.entries(input.categories)) {
            mappedCategories[name] = { restriction };
        }

        const response = await nango.put({
            // https://inflight.dope.security/dope.apis/public-api-specification
            endpoint: `/v1/policies/${encodeURIComponent(input.policyName)}/content/restrictions`,
            data: {
                data: {
                    categories: mappedCategories
                }
            },
            retries: 3
        });

        // The provider's successful PUT response is just a success message; it does
        // not echo back the applied restrictions, so we return what was requested.
        ProviderSuccessSchema.parse(response.data);

        return {
            policyName: input.policyName,
            categories: mappedCategories
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
