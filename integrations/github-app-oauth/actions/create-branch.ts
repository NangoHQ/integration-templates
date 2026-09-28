import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('The name of the repository, without the .git extension. Example: "nango"'),
        branch: z.string().describe('The name of the branch to create, without the refs/heads/ prefix. Example: "feature/new-ui"'),
        sha: z.string().describe('The SHA1 of the commit the new branch should point at. Example: "aa218f56b14c9653891f9e74264a383fa43fefbd"')
    })
    .describe('Input for creating a branch in a repository');

const OutputSchema = z
    .object({
        ref: z.string().describe('The fully qualified name of the created git ref. Example: "refs/heads/feature/new-ui"'),
        node_id: z.string().describe('The node ID of the created git ref'),
        url: z.string().describe('The API URL of the created git ref'),
        object: z
            .object({
                type: z.string().describe('The type of git object the ref points to, e.g. "commit"'),
                sha: z.string().describe('The SHA of the git object the ref points to'),
                url: z.string().describe('The API URL of the git object the ref points to')
            })
            .describe('The git object the new branch points to')
    })
    .describe('The created git branch ref');

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

/**
 * @tags: [write]
 * @tagReason: Creates a new git ref (branch) in the repository.
 * @pitfalls: A call for a branch name that already exists fails with a 422 error instead of returning the existing branch. The sha must point to a commit that already exists in the repository.
 */
const action = createAction({
    description: 'Create a new branch (git ref) pointing at an existing commit.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:write'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/rest/git/refs#create-a-reference
        const response = await nango.post({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/refs`,
            data: {
                ref: `refs/heads/${input.branch}`,
                sha: input.sha
            },
            retries: 3
        });

        const createdRef = ProviderRefSchema.parse(response.data);

        return {
            ref: createdRef.ref,
            node_id: createdRef.node_id,
            url: createdRef.url,
            object: {
                type: createdRef.object.type,
                sha: createdRef.object.sha,
                url: createdRef.object.url
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
