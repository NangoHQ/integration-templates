import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('Repository owner. Example: "octocat"'),
    repo: z.string().describe('Repository name. Example: "hello-world"'),
    name: z.string().describe('Label name. Example: "bug"'),
    color: z.string().describe('Color of the label in hexadecimal format without leading hash. Example: "ff0000"'),
    description: z.string().optional().describe('Description of the label. Example: "Something is broken"')
});

const ProviderLabelSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    url: z.string(),
    name: z.string(),
    color: z.string(),
    default: z.boolean(),
    description: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    url: z.string(),
    name: z.string(),
    color: z.string(),
    default: z.boolean(),
    description: z.string().optional()
});

const action = createAction({
    description: 'Create a repository label with name, color, and description',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-label',
        group: 'Labels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/issues/labels#create-a-label
        const response = await nango.post({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/labels`,
            data: {
                name: input.name,
                color: input.color,
                ...(input.description !== undefined && { description: input.description })
            },
            retries: 3
        });

        const providerLabel = ProviderLabelSchema.parse(response.data);

        return {
            id: providerLabel.id,
            node_id: providerLabel.node_id,
            url: providerLabel.url,
            name: providerLabel.name,
            color: providerLabel.color,
            default: providerLabel.default,
            ...(providerLabel.description !== null && { description: providerLabel.description })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
