import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('PostHog project ID. Example: "309484"'),
    id: z.string().describe('Early access feature ID. Example: "019e8d60-fbc1-0000-d729-cb62a5d65a45"')
});

const FeatureFlagSchema = z.object({
    id: z.number(),
    team_id: z.number(),
    name: z.string(),
    key: z.string(),
    filters: z.record(z.string(), z.unknown()),
    deleted: z.boolean(),
    active: z.boolean(),
    ensure_experience_continuity: z.boolean(),
    version: z.number(),
    evaluation_runtime: z.string(),
    bucketing_identifier: z.string(),
    evaluation_contexts: z.array(z.string())
});

const OutputSchema = z.object({
    id: z.string(),
    feature_flag: FeatureFlagSchema,
    name: z.string(),
    description: z.string().optional(),
    stage: z.string(),
    documentation_url: z.string().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
    created_at: z.string()
});

const action = createAction({
    description: 'Retrieve a single early access feature from PostHog.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-early-access-feature',
        group: 'Early Access Features'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['early_access_feature:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://posthog.com/docs/api/early-access-feature
        const response = await nango.get({
            endpoint: `/api/projects/${encodeURIComponent(input.project_id)}/early_access_feature/${encodeURIComponent(input.id)}/`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Early access feature not found',
                project_id: input.project_id,
                id: input.id
            });
        }

        const providerFeature = OutputSchema.parse(response.data);

        return {
            id: providerFeature.id,
            feature_flag: providerFeature.feature_flag,
            name: providerFeature.name,
            ...(providerFeature.description !== undefined && { description: providerFeature.description }),
            stage: providerFeature.stage,
            ...(providerFeature.documentation_url !== undefined && { documentation_url: providerFeature.documentation_url }),
            ...(providerFeature.payload !== undefined && { payload: providerFeature.payload }),
            created_at: providerFeature.created_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
