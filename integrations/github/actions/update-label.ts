import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('Repository owner. Example: "octocat"'),
    repo: z.string().describe('Repository name. Example: "hello-world"'),
    name: z.string().describe('Current name of the label. Example: "bug"'),
    new_name: z.string().optional().describe('New name for the label. Example: "critical-bug"'),
    color: z.string().optional().describe('Color for the label in hexadecimal format without the leading #. Example: "ff0000"'),
    description: z.string().nullable().optional().describe('Short description of the label. Pass null to clear. Example: "Something is not working"')
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
    description: "Update a repository label's name, color, or description.",
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, string | null> = {};

        if (input.new_name !== undefined) {
            body['name'] = input.new_name;
        }
        if (input.color !== undefined) {
            body['color'] = input.color;
        }
        if (input.description !== undefined) {
            body['description'] = input.description;
        }

        const response = await nango.patch({
            // https://docs.github.com/en/rest/issues/labels#update-a-label
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/labels/${encodeURIComponent(input.name)}`,
            data: body,
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
            color: providerLabel.color,
            default: providerLabel.default,
            ...(providerLabel.description != null && { description: providerLabel.description })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
