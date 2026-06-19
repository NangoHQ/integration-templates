import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('PostHog project ID. Example: "309484"'),
    id: z.string().describe('Early access feature ID. Example: "497f6eca-6276-4993-bfeb-53cbbbba6f08"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.string()
});

const action = createAction({
    description: 'Delete an early access feature in PostHog.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['early_access_feature:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const projectId = input.project_id;

        // https://posthog.com/docs/api/early-access-feature
        await nango.delete({
            endpoint: `/api/projects/${encodeURIComponent(projectId)}/early_access_feature/${encodeURIComponent(input.id)}/`,
            retries: 3
        });

        return {
            success: true,
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
