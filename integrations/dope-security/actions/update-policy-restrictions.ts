import { z } from 'zod';
import { createAction } from 'nango';

const RestrictionValue = z.enum(['ALLOW', 'BLOCK', 'WARNING']);

const InputSchema = z.object({
    policyName: z.string().describe('Policy name. Max 32 characters, no special characters. Example: "RegistrySeedPolicy1"'),
    categories: z.record(z.string(), RestrictionValue).describe('Map of category names to restriction values.')
});

const ProviderCategoryEntrySchema = z.object({
    restriction: z.string().optional()
});

const ProviderResponseSchema = z
    .object({
        data: z
            .object({
                categories: z.record(z.string(), ProviderCategoryEntrySchema).optional()
            })
            .passthrough()
    })
    .passthrough();

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

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (parsed.success) {
            const categoriesData = parsed.data.data.categories;
            if (categoriesData !== undefined) {
                const categories: Record<string, { restriction: string }> = {};
                for (const [name, entry] of Object.entries(categoriesData)) {
                    if (entry.restriction !== undefined) {
                        categories[name] = { restriction: entry.restriction };
                    }
                }
                return {
                    policyName: input.policyName,
                    categories
                };
            }
        }

        return {
            policyName: input.policyName,
            categories: mappedCategories
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
