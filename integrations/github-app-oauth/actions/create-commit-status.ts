import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "octocat"'),
        repo: z.string().describe('Repository name. Example: "hello-world"'),
        sha: z.string().describe('Commit SHA for which the status should be created. Example: "6dcb09b5b57875f334f61aebed695e2e4193db5e"'),
        state: z.enum(['error', 'failure', 'pending', 'success']).describe('State of the status. Can be one of: error, failure, pending, success.'),
        target_url: z.string().optional().describe('Target URL to associate with this status. Example: "https://ci.example.com/1000/output"'),
        description: z.string().optional().describe('Short description of the status. Example: "Build has completed successfully"'),
        context: z
            .string()
            .optional()
            .describe('A string label to differentiate this status from the status of other systems. Example: "continuous-integration/jenkins"')
    })
    .describe('Input for creating a commit status on a GitHub repository.');

const ProviderStatusSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    state: z.string(),
    description: z.string().nullable(),
    target_url: z.string().nullable(),
    context: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    creator: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the status.'),
        node_id: z.string().describe('Global node ID for GitHub API v4 compatibility.'),
        state: z.string().describe('State of the status.'),
        description: z.string().optional().describe('Short description of the status.'),
        target_url: z.string().optional().describe('Target URL associated with the status.'),
        context: z.string().describe('Label identifying the source of the status.'),
        created_at: z.string().describe('Creation timestamp in ISO 8601 format.'),
        updated_at: z.string().describe('Last update timestamp in ISO 8601 format.'),
        creator: z.record(z.string(), z.unknown()).optional().describe('User who created the status.')
    })
    .describe('Output of a created GitHub commit status.');

/**
 * @tags: [write]
 * @tagReason: Creates a new commit status on the specified SHA.
 * @pitfalls: When context is omitted it defaults to "default", causing multiple calls to share the same UI slot; description is limited to 140 characters.
 */
const action = createAction({
    description: 'Create a status (e.g. for CI) on a specific commit.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['statuses:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.github.com/en/rest/commits/statuses#create-a-commit-status
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/statuses/${encodeURIComponent(input.sha)}`,
            data: {
                state: input.state,
                ...(input.target_url !== undefined && { target_url: input.target_url }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.context !== undefined && { context: input.context })
            },
            retries: 3
        });

        const providerStatus = ProviderStatusSchema.parse(response.data);

        return {
            id: providerStatus.id,
            node_id: providerStatus.node_id,
            state: providerStatus.state,
            ...(providerStatus.description != null && { description: providerStatus.description }),
            ...(providerStatus.target_url != null && { target_url: providerStatus.target_url }),
            context: providerStatus.context,
            created_at: providerStatus.created_at,
            updated_at: providerStatus.updated_at,
            ...(providerStatus.creator !== undefined && { creator: providerStatus.creator })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
