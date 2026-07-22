import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.string().describe('Project ID or name. Example: "nango-test-main"'),
    domain: z.string().describe('Domain to remove. Example: "nango-test-delete-domain-a.com"')
});

const OutputSchema = z.object({});

const action = createAction({
    description: 'Remove a domain from a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://vercel.com/docs/rest-api/reference#delete-a-project-domain
        const response = await nango.delete({
            endpoint: `/v9/projects/${encodeURIComponent(input.projectId)}/domains/${encodeURIComponent(input.domain)}`,
            retries: 3
        });

        const parsed = z.object({}).parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
