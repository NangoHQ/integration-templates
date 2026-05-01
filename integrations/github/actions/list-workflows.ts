import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('Repository owner. Example: "octocat"'),
    repo: z.string().describe('Repository name. Example: "hello-world"'),
    per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page (max 100).'),
    page: z.number().int().min(1).optional().describe('Page number of the results to fetch.')
});

const WorkflowSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    name: z.string(),
    path: z.string(),
    state: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    url: z.string(),
    html_url: z.string(),
    badge_url: z.string()
});

const OutputSchema = z.object({
    total_count: z.number(),
    workflows: z.array(WorkflowSchema)
});

const action = createAction({
    description: 'List GitHub Actions workflows configured in a repository.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-workflows'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['actions:read'],

    exec: async (nango, input) => {
        // https://docs.github.com/en/rest/actions/workflows?apiVersion=2022-11-28#list-repository-workflows
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/workflows`,
            params: {
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                ...(input.page !== undefined && { page: String(input.page) })
            },
            retries: 3
        });

        const providerData = z
            .object({
                total_count: z.number(),
                workflows: z.array(WorkflowSchema)
            })
            .parse(response.data);

        return {
            total_count: providerData.total_count,
            workflows: providerData.workflows
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
