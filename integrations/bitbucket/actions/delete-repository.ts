import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-secondary-repo"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    workspace: z.string(),
    repo_slug: z.string()
});

const action = createAction({
    description: 'Delete a repository.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repository:delete'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.atlassian.com/cloud/bitbucket/rest/intro/
        await nango.delete({
            endpoint: `/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}`,
            retries: 3
        });

        return {
            success: true,
            workspace: input.workspace,
            repo_slug: input.repo_slug
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
