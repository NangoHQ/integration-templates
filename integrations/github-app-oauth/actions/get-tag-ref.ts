import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner login. Example: "octocat"'),
        repo: z.string().describe('Repository name. Example: "Hello-World"'),
        ref: z
            .string()
            .describe(
                'Git reference to retrieve. Prefix with "tags/" for tags (e.g. "tags/v1.0.0") or "heads/" for branches (e.g. "heads/main"). GitHub also accepts the full "refs/..." form.'
            )
    })
    .describe('Parameters to retrieve a single Git reference from a repository.');

const GitObjectSchema = z.object({
    type: z.string().describe('Type of the referenced object. Example: "commit" or "tag".'),
    sha: z.string().describe('SHA of the referenced object.'),
    url: z.string().describe('API URL of the referenced object.')
});

const OutputSchema = z
    .object({
        ref: z.string().describe('Full git reference path. Example: "refs/tags/v1.0.0".'),
        node_id: z.string().describe('Global node ID for use in GitHub GraphQL API.'),
        url: z.string().describe('API URL of this reference.'),
        object: GitObjectSchema.describe('The object this reference points to.')
    })
    .describe('A single Git reference and the object it points to.');

/**
 * @tags: [read]
 * @tagReason: Reads a single git reference (tag or branch) from the provider.
 * @pitfalls: GitHub returns an array of matching refs when the requested ref is ambiguous, causing this action to throw a validation error; pass the full exact ref path to avoid prefix matches.
 */
const action = createAction({
    description: 'Retrieve a tag ref or branch-style Git reference.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/rest/git/refs#get-a-reference
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/ref/${encodeURIComponent(input.ref)}`,
            retries: 3
        });

        const providerRef = z
            .object({
                ref: z.string(),
                node_id: z.string(),
                url: z.string(),
                object: z.object({
                    type: z.string(),
                    sha: z.string(),
                    url: z.string()
                })
            })
            .parse(response.data);

        return {
            ref: providerRef.ref,
            node_id: providerRef.node_id,
            url: providerRef.url,
            object: {
                type: providerRef.object.type,
                sha: providerRef.object.sha,
                url: providerRef.object.url
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
