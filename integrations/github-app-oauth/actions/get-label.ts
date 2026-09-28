import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "octocat"'),
        repo: z.string().describe('Repository name. Example: "Hello-World"'),
        name: z.string().describe('Label name. Example: "bug"')
    })
    .describe('Input for retrieving a single repository label by name.');

const ProviderLabelSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    url: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    color: z.string(),
    default: z.boolean().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique label ID.'),
        node_id: z.string().describe('Global node ID.'),
        url: z.string().describe('API URL for this label.'),
        name: z.string().describe('Label name.'),
        description: z.string().optional().describe('Short label description.'),
        color: z.string().describe('6-character hex color without the leading #.'),
        default: z.boolean().optional().describe('Whether this is a default repository label.')
    })
    .describe('A single repository label returned by the GitHub API.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single repository label by name without modifying any provider data.
 */
const action = createAction({
    description: 'Retrieve a single repository label by name.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.github.com/rest/issues/labels#get-a-label
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/labels/${encodeURIComponent(input.name)}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Label "${input.name}" not found in repository ${input.owner}/${input.repo}.`
            });
        }

        const label = ProviderLabelSchema.parse(response.data);

        return {
            id: label.id,
            node_id: label.node_id,
            url: label.url,
            name: label.name,
            ...(label.description != null && { description: label.description }),
            color: label.color,
            ...(label.default !== undefined && { default: label.default })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
