import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('PostHog project ID. Example: "309484"'),
    id: z.string().describe('Alert ID to delete. Example: "019e8d62-1ef1-0000-c642-6a68245a8aac"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete an alert in PostHog.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['alert:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const projectId = input.project_id;

        // https://posthog.com/docs/api/alerts
        await nango.delete({
            endpoint: `/api/projects/${encodeURIComponent(projectId)}/alerts/${encodeURIComponent(input.id)}/`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
