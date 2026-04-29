import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('Repository owner. Example: "octocat"'),
    repo: z.string().describe('Repository name. Example: "hello-world"'),
    per_page: z.number().optional().describe('Number of results per page (max 100).'),
    page: z.number().optional().describe('Page number of the results to fetch.')
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

function isRecord(obj: unknown): obj is Record<string, unknown> {
    return typeof obj === 'object' && obj !== null;
}

function getValue(obj: unknown, key: string): unknown {
    if (isRecord(obj) && key in obj) {
        return obj[key];
    }
    return undefined;
}

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
                workflows: z.array(z.unknown())
            })
            .parse(response.data);

        const workflows = providerData.workflows.map((workflow) => ({
            id: Number(getValue(workflow, 'id')),
            node_id: String(getValue(workflow, 'node_id') || ''),
            name: String(getValue(workflow, 'name') || ''),
            path: String(getValue(workflow, 'path') || ''),
            state: String(getValue(workflow, 'state') || ''),
            created_at: String(getValue(workflow, 'created_at') || ''),
            updated_at: String(getValue(workflow, 'updated_at') || ''),
            url: String(getValue(workflow, 'url') || ''),
            html_url: String(getValue(workflow, 'html_url') || ''),
            badge_url: String(getValue(workflow, 'badge_url') || '')
        }));

        return {
            total_count: providerData.total_count,
            workflows
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
