import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "octocat"'),
        repo: z.string().describe('Repository name. Example: "Hello-World"'),
        branch_name: z.string().describe('Name of the new branch to create. Example: "feature/my-branch"'),
        sha: z.string().describe('SHA of the existing commit the new branch should point to. Example: "aa218f56b14c9653891f9e74264a383fa43fefbd"')
    })
    .describe('Input for creating a new branch pointing at an existing commit.');

const ProviderRefObjectSchema = z.object({
    sha: z.string(),
    type: z.string(),
    url: z.string()
});

const ProviderRefSchema = z.object({
    ref: z.string(),
    node_id: z.string(),
    url: z.string(),
    object: ProviderRefObjectSchema
});

const OutputSchema = z
    .object({
        ref: z.string().describe('Full git ref of the created branch. Example: "refs/heads/feature/my-branch"'),
        node_id: z.string().describe('Global node ID for the created ref.'),
        url: z.string().describe('API URL for the created ref.'),
        object: z
            .object({
                sha: z.string().describe('SHA of the commit the ref points to.'),
                type: z.string().describe('Type of the git object. Typically "commit".'),
                url: z.string().describe('API URL for the git object.')
            })
            .describe('The git object the new ref points to.')
    })
    .describe('Output of the created git branch reference.');

/**
 * @tags: [write]
 * @tagReason: Creates a new git ref (branch) on the provider.
 * @pitfalls: Returns 422 if the branch already exists; this call is not idempotent.
 */
const action = createAction({
    description: 'Create a new branch (git ref) pointing at an existing commit.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.github.com/rest/git/refs#create-a-reference
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/refs`,
            data: {
                ref: `refs/heads/${input.branch_name}`,
                sha: input.sha
            },
            retries: 3
        });

        const providerRef = ProviderRefSchema.parse(response.data);

        return {
            ref: providerRef.ref,
            node_id: providerRef.node_id,
            url: providerRef.url,
            object: {
                sha: providerRef.object.sha,
                type: providerRef.object.type,
                url: providerRef.object.url
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
