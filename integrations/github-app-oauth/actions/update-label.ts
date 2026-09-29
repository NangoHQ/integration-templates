import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner name. Example: "octocat"'),
        repo: z.string().describe('Repository name. Example: "Hello-World"'),
        name: z.string().describe('Current label name. Example: "bug"'),
        new_name: z.string().optional().describe('New name for the label. Example: "Bug"'),
        color: z.string().optional().describe('6-character hex color code without the leading #. Example: "ff0000"'),
        description: z.string().nullable().optional().describe('A short description of the label. Pass null to clear the description.')
    })
    .describe('Input parameters for updating a repository label.');

const ProviderLabelSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    url: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    color: z.string(),
    default: z.boolean()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier for the label.'),
        node_id: z.string().describe('Global node ID for the label.'),
        url: z.string().describe('API URL for the label.'),
        name: z.string().describe('Label name.'),
        description: z.string().optional().describe('Label description, if present.'),
        color: z.string().describe('Label color as a 6-character hex code.'),
        default: z.boolean().describe('Whether this is a default repository label.')
    })
    .describe('Updated repository label returned by the provider.');

/**
 * @tags: [write]
 * @tagReason: Mutates an existing label on the provider by patching its name, color, or description.
 */
const action = createAction({
    description: "Update a repository label's name, color, or description.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://docs.github.com/rest/issues/labels#update-a-label
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/labels/${encodeURIComponent(input.name)}`,
            data: {
                ...(input.new_name !== undefined && { new_name: input.new_name }),
                ...(input.color !== undefined && { color: input.color }),
                ...(input.description !== undefined && { description: input.description })
            },
            retries: 3
        });

        const label = ProviderLabelSchema.parse(response.data);

        return {
            id: label.id,
            node_id: label.node_id,
            url: label.url,
            name: label.name,
            ...(label.description != null && { description: label.description }),
            color: label.color,
            default: label.default
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
