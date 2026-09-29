import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository (user or organization login). Example: "octocat"'),
        repo: z.string().describe('The name of the repository without the .git extension. Example: "hello-world"'),
        deployment_id: z.number().int().describe('ID of the deployment to attach the new status to. Example: 5850133226'),
        state: z.enum(['success', 'failure', 'error', 'in_progress', 'queued', 'pending']).describe('The state of the deployment status. Example: "success"'),
        description: z
            .string()
            .max(140)
            .optional()
            .describe('A short description of the status. Maximum 140 characters. Example: "Deployment finished successfully."')
    })
    .describe('Input for creating a deployment status on a deployment.');

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the created deployment status. Example: 1234567890'),
        state: z.string().describe('State of the created deployment status. Example: "success"'),
        description: z.string().optional().describe('Short description of the status, when provided. Example: "Deployment finished successfully."'),
        environment: z.string().optional().describe('Name of the deployment environment. Example: "production"'),
        target_url: z.string().optional().describe('Target URL associated with the status. Example: "https://example.com/deployment/42/output"'),
        log_url: z.string().optional().describe('Full URL of the deployment output logs. Example: "https://example.com/deployment/42/output"'),
        url: z.string().optional().describe('API URL of the created deployment status.'),
        created_at: z.string().describe('ISO 8601 timestamp of when the status was created. Example: "2026-08-11T12:00:00Z"'),
        updated_at: z.string().describe('ISO 8601 timestamp of when the status was last updated. Example: "2026-08-11T12:00:00Z"')
    })
    .describe('The created deployment status.');

const DeploymentStatusResponseSchema = z.object({
    id: z.number(),
    state: z.string(),
    description: z.string().optional(),
    environment: z.string().optional(),
    target_url: z.string().optional(),
    log_url: z.string().optional(),
    url: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

/**
 * @tags: [write]
 * @tagReason: Creates a new deployment status on an existing deployment; no provider data is read.
 * @pitfalls: Deployment statuses are append-only and cannot be edited or deleted once created, and GitHub stops returning previous statuses after 90 days. A success status automatically marks prior non-production deployments in the same environment inactive by default (auto_inactive), which this action cannot override.
 */
const action = createAction({
    description: 'Add a status update to a deployment (e.g. success, failure, in_progress).',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deployments:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/deployments/statuses#create-a-deployment-status
        const response = await nango.post({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/deployments/${input.deployment_id}/statuses`,
            data: {
                state: input.state,
                ...(input.description !== undefined && { description: input.description })
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- Deployment statuses are append-only and non-idempotent; retrying after a lost response would create a duplicate status instead of replaying the original one.
            retries: 0
        });

        const status = DeploymentStatusResponseSchema.parse(response.data);

        return {
            id: status.id,
            state: status.state,
            ...(status.description ? { description: status.description } : {}),
            ...(status.environment ? { environment: status.environment } : {}),
            ...(status.target_url ? { target_url: status.target_url } : {}),
            ...(status.log_url ? { log_url: status.log_url } : {}),
            ...(status.url ? { url: status.url } : {}),
            created_at: status.created_at,
            updated_at: status.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
