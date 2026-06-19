import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Survey ID. Example: "497f6eca-6276-4993-bfeb-53cbbbba6f08"'),
    project_id: z.string().describe('PostHog project ID. Example: "309484"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a survey in PostHog.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['survey:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://posthog.com/docs/api/surveys
        await nango.delete({
            endpoint: `/api/projects/${encodeURIComponent(input.project_id)}/surveys/${encodeURIComponent(input.id)}/`,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
