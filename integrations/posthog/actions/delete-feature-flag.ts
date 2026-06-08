import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('PostHog project ID. Example: "309484"'),
    id: z.number().describe('Feature flag ID. Example: 700472')
});

const ProviderFeatureFlagSchema = z
    .object({
        id: z.number(),
        key: z.string().optional(),
        deleted: z.boolean().optional(),
        active: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number(),
    key: z.string().optional(),
    deleted: z.boolean().optional()
});

const action = createAction({
    description: 'Delete or archive a feature flag in PostHog',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-feature-flag',
        group: 'Feature Flags'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['feature_flag:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const projectId = input.project_id;

        // https://posthog.com/docs/api/feature-flags
        const response = await nango.patch({
            endpoint: `/api/projects/${encodeURIComponent(projectId)}/feature_flags/${encodeURIComponent(String(input.id))}/`,
            data: {
                deleted: true
            },
            retries: 3
        });

        const providerFlag = ProviderFeatureFlagSchema.parse(response.data);

        return {
            id: providerFlag.id,
            ...(providerFlag.key !== undefined && { key: providerFlag.key }),
            ...(providerFlag.deleted !== undefined && { deleted: providerFlag.deleted })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
