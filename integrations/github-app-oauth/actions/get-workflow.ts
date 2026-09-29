import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. The name is not case sensitive.'),
        repo: z.string().describe('The name of the repository. The name is not case sensitive.'),
        workflow_id: z.union([z.number(), z.string()]).describe('The ID of the workflow or the workflow file name, for example "ci.yml".')
    })
    .describe('Input for retrieving a single GitHub Actions workflow.');

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

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the workflow.'),
        node_id: z.string().describe('The node ID of the workflow.'),
        name: z.string().describe('The name of the workflow.'),
        path: z.string().describe('The path to the workflow file.'),
        state: z.string().describe('The current state of the workflow.'),
        created_at: z.string().describe('The date and time when the workflow was created.'),
        updated_at: z.string().describe('The date and time when the workflow was last updated.'),
        url: z.string().describe('The API URL for the workflow.'),
        html_url: z.string().describe('The HTML URL for the workflow.'),
        badge_url: z.string().describe('The badge URL for the workflow.')
    })
    .describe('Details of a single GitHub Actions workflow.');

/**
 * @tags: [read]
 * @tagReason: Reads a single workflow definition from the GitHub Actions API.
 */
const action = createAction({
    description: 'Get details of a single workflow by ID or filename.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['actions:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const workflowId = typeof input.workflow_id === 'number' ? String(input.workflow_id) : input.workflow_id;

        const response = await nango.get({
            // https://docs.github.com/rest/actions/workflows#get-a-workflow
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/workflows/${encodeURIComponent(workflowId)}`,
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

        const providerWorkflow = ProviderWorkflowSchema.parse(response.data);

        return {
            id: providerWorkflow.id,
            node_id: providerWorkflow.node_id,
            name: providerWorkflow.name,
            path: providerWorkflow.path,
            state: providerWorkflow.state,
            created_at: providerWorkflow.created_at,
            updated_at: providerWorkflow.updated_at,
            url: providerWorkflow.url,
            html_url: providerWorkflow.html_url,
            badge_url: providerWorkflow.badge_url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
