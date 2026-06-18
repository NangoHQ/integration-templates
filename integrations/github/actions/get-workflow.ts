import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('The account owner of the repository. Example: "octocat"'),
    repo: z.string().describe('The name of the repository. Example: "hello-world"'),
    workflow_id: z
        .union([z.number(), z.string()])
        .describe('The ID of the workflow. You can also pass the workflow file name as a string. Example: 12345 or "main.yaml"')
});

const ProviderWorkflowSchema = z.object({
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
    id: z.number().describe('The ID of the workflow'),
    node_id: z.string().optional().describe('The node ID of the workflow'),
    name: z.string().describe('The name of the workflow'),
    path: z.string().describe('The path to the workflow file'),
    state: z.string().describe('The state of the workflow (e.g., "active")'),
    created_at: z.string().optional().describe('The creation timestamp'),
    updated_at: z.string().optional().describe('The last update timestamp'),
    url: z.string().optional().describe('The API URL for the workflow'),
    html_url: z.string().optional().describe('The HTML URL for the workflow'),
    badge_url: z.string().optional().describe('The badge URL for the workflow status')
});

const action = createAction({
    description: 'Retrieve metadata for a GitHub Actions workflow.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/actions/workflows?apiVersion=2022-11-28#get-a-workflow
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/workflows/${encodeURIComponent(String(input.workflow_id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Workflow not found',
                owner: input.owner,
                repo: input.repo,
                workflow_id: input.workflow_id
            });
        }

        const workflow = ProviderWorkflowSchema.parse(response.data);

        return {
            id: workflow.id,
            node_id: workflow.node_id,
            name: workflow.name,
            path: workflow.path,
            state: workflow.state,
            created_at: workflow.created_at,
            updated_at: workflow.updated_at,
            url: workflow.url,
            html_url: workflow.html_url,
            badge_url: workflow.badge_url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
