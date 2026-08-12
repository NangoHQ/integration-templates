import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner (user or organization name). Example: "nango-provisioned-apps"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        deployment_id: z.number().int().positive().describe('The unique identifier of the deployment. Example: 5850133226'),
        state: z.enum(['success', 'failure', 'error', 'in_progress', 'queued', 'pending']).describe('The state of the status.'),
        description: z.string().optional().describe('A short description of the status.')
    })
    .describe('Input to create a deployment status on a GitHub repository.');

const CreatorSchema = z.object({
    id: z.number().describe('The unique identifier of the creator.'),
    login: z.string().describe('The username of the creator.'),
    node_id: z.string().describe('The global node ID of the creator.'),
    avatar_url: z.string().describe("The URL of the creator's avatar image."),
    html_url: z.string().describe('The GitHub profile URL of the creator.'),
    type: z.string().describe('The type of GitHub user (e.g. "Bot", "User", "Organization").')
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the deployment status.'),
        node_id: z.string().describe('The global node ID of the deployment status.'),
        state: z.string().describe('The state of the deployment status.'),
        description: z.string().nullable().optional().describe('A short description of the status.'),
        environment: z.string().optional().describe('The name of the target deployment environment.'),
        environment_url: z.string().optional().describe('The URL for the deployed environment.'),
        log_url: z.string().optional().describe('The URL for the deployment status log.'),
        target_url: z.string().optional().describe('The URL to associate with the status.'),
        url: z.string().describe('The API URL for this deployment status.'),
        created_at: z.string().describe('When the status was created.'),
        updated_at: z.string().describe('When the status was last updated.'),
        deployment_url: z.string().describe('The API URL for the parent deployment.'),
        repository_url: z.string().describe('The API URL for the repository.'),
        creator: CreatorSchema.optional().describe('The GitHub user that created the status.')
    })
    .describe('Output representing a newly created GitHub deployment status.');

/**
 * @tags: [write]
 * @tagReason: Creates a new deployment status record on the provider.
 * @pitfalls: Deployment statuses are immutable and cannot be edited or deleted after creation; unset URL fields are returned as empty strings rather than omitted.
 */
const action = createAction({
    description: 'Add a status update to a deployment (e.g. success, failure, in_progress)',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deployments:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.github.com/en/rest/deployments/statuses#create-a-deployment-status
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/deployments/${encodeURIComponent(String(input.deployment_id))}/statuses`,
            data: {
                state: input.state,
                ...(input.description !== undefined && { description: input.description })
            },
            // Zero: creating a deployment status is not idempotent and there's no idempotency key,
            // so retrying a request whose response was lost (while GitHub still accepted it) would
            // create a duplicate status.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const providerStatus = OutputSchema.parse(response.data);

        return providerStatus;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
