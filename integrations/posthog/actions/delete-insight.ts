import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('PostHog project ID. Example: "309484"'),
    id: z.number().describe('Insight ID. Example: 9037904')
});

const ProviderInsightSchema = z.object({
    id: z.number(),
    short_id: z.string(),
    name: z.string().nullable().optional(),
    derived_name: z.string().nullable().optional(),
    deleted: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    short_id: z.string(),
    name: z.string().optional(),
    derived_name: z.string().optional(),
    deleted: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive an insight in PostHog.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['insight:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const projectId = input.project_id;

        // https://posthog.com/docs/api/insights
        // PostHog does not allow hard deletes via DELETE (returns 405).
        // Archiving is done by PATCHing deleted to true.
        const response = await nango.patch({
            endpoint: `/api/projects/${encodeURIComponent(String(projectId))}/insights/${encodeURIComponent(String(input.id))}/`,
            data: {
                deleted: true
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Insight not found or could not be archived.',
                id: input.id
            });
        }

        const providerInsight = ProviderInsightSchema.parse(response.data);

        return {
            id: providerInsight.id,
            short_id: providerInsight.short_id,
            ...(providerInsight.name != null && { name: providerInsight.name }),
            ...(providerInsight.derived_name != null && { derived_name: providerInsight.derived_name }),
            ...(providerInsight.deleted !== undefined && { deleted: providerInsight.deleted }),
            ...(providerInsight.created_at !== undefined && { created_at: providerInsight.created_at }),
            ...(providerInsight.updated_at !== undefined && { updated_at: providerInsight.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
