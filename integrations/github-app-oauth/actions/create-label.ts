import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner name. Example: "octocat"'),
        repo: z.string().describe('Repository name. Example: "Hello-World"'),
        name: z.string().describe('Label name. Example: "bug"'),
        color: z.string().describe('6-character hex color code without the leading #. Example: "d73a4a"'),
        description: z.string().optional().describe('Short description of the label. Example: "Something is not working"')
    })
    .describe('Input to create a repository label');

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier for the label'),
        node_id: z.string().describe('Global node ID for the label'),
        url: z.string().describe('API URL for the label'),
        name: z.string().describe('Label name'),
        description: z.string().optional().describe('Label description'),
        color: z.string().describe('6-character hex color code'),
        default: z.boolean().describe('Whether this is a default label')
    })
    .describe('Output of a created repository label');

/**
 * @tags: [write]
 * @tagReason: Creates a new label in the repository.
 * @pitfalls: A duplicate label name causes a 422 error. The color must be a 6-character hex code without the leading #.
 */
const action = createAction({
    description: 'Create a repository label with name, color, and description',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.github.com/en/rest/issues/labels#create-a-label
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/labels`,
            data: {
                name: input.name,
                color: input.color,
                ...(input.description !== undefined && { description: input.description })
            },
            retries: 3
        });

        const providerLabel = z
            .object({
                id: z.number(),
                node_id: z.string(),
                url: z.string(),
                name: z.string(),
                description: z.string().nullish(),
                color: z.string(),
                default: z.boolean()
            })
            .parse(response.data);

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
