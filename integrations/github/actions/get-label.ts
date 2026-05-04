import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('The account owner of the repository. Example: "octocat"'),
    repo: z.string().describe('The name of the repository. Example: "hello-world"'),
    name: z.string().describe('The name of the label. Example: "bug"')
});

const ProviderLabelSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    url: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    color: z.string(),
    default: z.boolean()
});

const OutputSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    url: z.string(),
    name: z.string(),
    description: z.string().optional(),
    color: z.string(),
    default: z.boolean()
});

const action = createAction({
    description: 'Retrieve a single repository label by name.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-label',
        group: 'Labels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.github.com/en/rest/issues/labels#get-a-label
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/labels/${encodeURIComponent(input.name)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Label not found',
                owner: input.owner,
                repo: input.repo,
                name: input.name
            });
        }

        const providerLabel = ProviderLabelSchema.parse(response.data);

        return {
            id: providerLabel.id,
            node_id: providerLabel.node_id,
            url: providerLabel.url,
            name: providerLabel.name,
            ...(providerLabel.description != null && { description: providerLabel.description }),
            color: providerLabel.color,
            default: providerLabel.default
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
