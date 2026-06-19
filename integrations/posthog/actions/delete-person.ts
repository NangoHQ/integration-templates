import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('PostHog project ID. Example: "309484"'),
    person_id: z.string().describe('PostHog person ID. Example: "623209ad-6b83-5d5c-9e25-df49eba324bb"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    person_id: z.string()
});

const action = createAction({
    description: 'Delete or archive a person in PostHog.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['person:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const projectId = input.project_id;

        // https://posthog.com/docs/api/persons
        const response = await nango.delete({
            endpoint: `/api/projects/${encodeURIComponent(projectId)}/persons/${encodeURIComponent(input.person_id)}/`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Person not found',
                person_id: input.person_id
            });
        }

        return {
            success: true,
            person_id: input.person_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
