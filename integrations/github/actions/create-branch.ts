import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('Repository owner. Example: "viictoo"'),
    repo: z.string().describe('Repository name. Example: "api-playground2"'),
    branch: z.string().describe('Name of the new branch. Example: "feature-branch"'),
    sha: z.string().describe('The SHA of the commit to create the branch from. Example: "abc123def..."')
});

const ProviderRefSchema = z.object({
    ref: z.string(),
    node_id: z.string(),
    url: z.string(),
    object: z.object({
        type: z.string(),
        sha: z.string(),
        url: z.string()
    })
});

const OutputSchema = z.object({
    ref: z.string().describe('The Git reference. Example: "refs/heads/feature-branch"'),
    sha: z.string().describe('The SHA of the referenced object'),
    type: z.string().describe('Type of the referenced object. Example: "commit"')
});

const action = createAction({
    description: 'Create a branch ref from an existing commit SHA',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-branch',
        group: 'Git'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/git/refs#create-a-reference
        const response = await nango.post({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/refs`,
            data: {
                ref: `refs/heads/${input.branch}`,
                sha: input.sha
            },
            retries: 10
        });

        const providerRef = ProviderRefSchema.parse(response.data);

        return {
            ref: providerRef.ref,
            sha: providerRef.object.sha,
            type: providerRef.object.type
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
