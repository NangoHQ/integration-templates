import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        sha: z.string().describe('Commit SHA to create the status for. Example: "abc123def456"'),
        state: z
            .enum(['error', 'failure', 'pending', 'success'])
            .describe('The state of the status. Must be one of "error", "failure", "pending", or "success".'),
        target_url: z.string().optional().describe('The target URL to associate with this status. Example: "https://ci.example.com/build/123"'),
        description: z.string().optional().describe('A short description of the status. Example: "Build succeeded"'),
        context: z
            .string()
            .optional()
            .describe(
                'A string label to differentiate this status from others. Example: "continuous-integration/jenkins". Defaults to "default" when omitted on GitHub.'
            )
    })
    .describe('Input to create a commit status on a specific repository and commit.');

const ProviderUserSchema = z.object({
    id: z.number(),
    login: z.string(),
    type: z.string()
});

const ProviderStatusSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    sha: z.string().optional(),
    state: z.string(),
    description: z.string().nullable(),
    target_url: z.string().nullable(),
    context: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    creator: ProviderUserSchema.nullable()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the status.'),
        node_id: z.string().describe('Global node ID for use in the GraphQL API.'),
        sha: z.string().describe('The commit SHA this status was posted to.'),
        state: z.string().describe('The state of the status.'),
        description: z.string().optional().describe('A short description of the status.'),
        target_url: z.string().optional().describe('The target URL associated with this status.'),
        context: z.string().describe('The label differentiating this status from others.'),
        created_at: z.string().describe('ISO 8601 timestamp when the status was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the status was last updated.'),
        creator: z
            .object({
                id: z.number().describe('User ID of the status creator.'),
                login: z.string().describe('Login username of the status creator.'),
                type: z.string().describe('Type of user account.')
            })
            .optional()
            .describe('The user or app that created this status.')
    })
    .describe('The created commit status returned by the GitHub API.');

/**
 * @tags: [write]
 * @tagReason: Creates a new commit status on the provider.
 * @pitfalls: Posting a status with the same `context` on the same commit updates the existing status rather than creating a separate entry.
 */
const action = createAction({
    description: 'Create a status (e.g. for CI) on a specific commit.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['statuses:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.github.com/rest/commits/statuses#create-a-commit-status
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/statuses/${encodeURIComponent(input.sha)}`,
            data: {
                state: input.state,
                ...(input.target_url !== undefined && { target_url: input.target_url }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.context !== undefined && { context: input.context })
            },
            retries: 10
        });

        const providerStatus = ProviderStatusSchema.parse(response.data);

        return {
            id: providerStatus.id,
            node_id: providerStatus.node_id,
            sha: providerStatus.sha ?? input.sha,
            state: providerStatus.state,
            ...(providerStatus.description != null && { description: providerStatus.description }),
            ...(providerStatus.target_url != null && { target_url: providerStatus.target_url }),
            context: providerStatus.context,
            created_at: providerStatus.created_at,
            updated_at: providerStatus.updated_at,
            ...(providerStatus.creator != null && {
                creator: {
                    id: providerStatus.creator.id,
                    login: providerStatus.creator.login,
                    type: providerStatus.creator.type
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
