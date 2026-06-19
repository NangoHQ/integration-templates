import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('PostHog project ID. Example: "309484"'),
    id: z.number().describe('Action ID to delete. Example: 275761')
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.number()
});

const action = createAction({
    description: 'Delete an action in PostHog.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['action:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const projectId = input.project_id;

        // https://posthog.com/docs/api/actions
        // PostHog does not allow hard deletes; PATCH with deleted:true is required.
        await nango.patch({
            endpoint: `/api/projects/${encodeURIComponent(projectId)}/actions/${encodeURIComponent(String(input.id))}/`,
            data: {
                deleted: true
            },
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
