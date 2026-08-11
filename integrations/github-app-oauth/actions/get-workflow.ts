import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        workflow_id: z.string().describe('Workflow ID or the filename of the workflow (e.g., "ci.yml"). Example: "331870956"')
    })
    .describe('Input parameters for retrieving a single repository workflow by ID or filename.');

const OutputSchema = z
    .object({
        id: z.number().describe('Workflow numeric ID.'),
        node_id: z.string().describe('Workflow node ID.'),
        name: z.string().describe('Workflow display name.'),
        path: z.string().describe('Workflow file path in the repository.'),
        state: z.string().describe('Workflow state, e.g. "active".'),
        created_at: z.string().describe('ISO 8601 timestamp when the workflow was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the workflow was last updated.'),
        url: z.string().describe('API URL for this workflow.'),
        html_url: z.string().describe('HTML URL for this workflow file.'),
        badge_url: z.string().describe('Badge image URL for this workflow.')
    })
    .describe('Details of a single repository workflow returned by the GitHub API.');

/**
 * @tags: [read]
 * @tagReason: Retrieves the details of a single repository workflow from the GitHub API.
 */
const action = createAction({
    description: 'Get details of a single workflow by ID or filename.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['actions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.github.com/rest/actions/workflows#get-a-workflow
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/actions/workflows/${encodeURIComponent(input.workflow_id)}`,
            retries: 3
        });

        const workflow = OutputSchema.parse(response.data);
        return workflow;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
