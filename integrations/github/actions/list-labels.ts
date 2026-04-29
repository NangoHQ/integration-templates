import { z } from 'zod';
import { createAction } from 'nango';

const LabelSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    url: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    color: z.string(),
    default: z.boolean()
});

const InputSchema = z.object({
    owner: z.string().describe('The account owner of the repository'),
    repo: z.string().describe('The name of the repository'),
    per_page: z.number().int().min(1).max(100).optional().describe('The number of results per page (max 100)'),
    page: z.number().int().min(1).optional().describe('The page number of the results to fetch')
});

const OutputSchema = z.object({
    labels: z.array(LabelSchema),
    next_page: z.number().optional()
});

const action = createAction({
    description: 'List repository labels with pagination',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-labels',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/issues/labels#list-labels-for-a-repository
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/labels`,
            params: {
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                ...(input.page !== undefined && { page: String(input.page) })
            },
            retries: 3
        });

        const labels = z.array(LabelSchema).parse(response.data);

        return {
            labels: labels,
            ...(input.per_page !== undefined && input.page !== undefined && labels.length === input.per_page && { next_page: input.page + 1 })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
