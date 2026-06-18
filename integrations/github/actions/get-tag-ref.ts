import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('The account owner of the repository. Example: "octocat"'),
    repo: z.string().describe('The name of the repository. Example: "hello-world"'),
    ref: z.string().describe('The Git reference to retrieve. Use "tags/<tag_name>" for tags or "heads/<branch_name>" for branches. Example: "tags/v1.0.0"')
});

const ProviderRefObjectSchema = z.object({
    type: z.string(),
    sha: z.string(),
    url: z.string()
});

const ProviderRefSchema = z.object({
    ref: z.string(),
    node_id: z.string(),
    url: z.string(),
    object: ProviderRefObjectSchema
});

const OutputSchema = z.object({
    ref: z.string(),
    node_id: z.string(),
    url: z.string(),
    object: z.object({
        type: z.string(),
        sha: z.string(),
        url: z.string()
    })
});

const action = createAction({
    description: 'Retrieve a tag ref or branch-style Git reference',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.github.com/en/rest/git/refs#get-a-reference
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/git/ref/${encodeURIComponent(input.ref)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Reference not found',
                ref: input.ref
            });
        }

        const providerRef = ProviderRefSchema.parse(response.data);

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
