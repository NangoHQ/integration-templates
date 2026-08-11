import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('The name of the repository. Example: "nango"'),
        ref: z.string().describe('The ref to deploy. This can be a branch, tag, or SHA. Example: "master"'),
        environment: z.string().optional().describe('The name of the target deployment environment. Example: "production"'),
        auto_merge: z
            .boolean()
            .optional()
            .describe('Whether to automatically merge the default branch into the requested ref before deploying. Defaults to true on GitHub.'),
        required_contexts: z
            .array(z.string())
            .optional()
            .describe('The status contexts to verify against commit status checks. Pass an empty array to skip all checks.')
    })
    .describe('Input parameters for creating a GitHub deployment.');

const CreatorSchema = z.object({
    login: z.string().describe('The username of the deployment creator.'),
    id: z.number().describe('The unique identifier of the creator.'),
    node_id: z.string().optional().describe('The global node ID of the creator.'),
    avatar_url: z.string().optional().describe("The URL of the creator's avatar image."),
    html_url: z.string().optional().describe("The URL of the creator's profile page."),
    type: z.string().optional().describe('The type of user. Example: "User" or "Bot".')
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the deployment.'),
        node_id: z.string().optional().describe('The global node ID for the deployment.'),
        sha: z.string().describe('The SHA of the commit that was deployed.'),
        ref: z.string().describe('The ref that was deployed.'),
        task: z.string().optional().describe('The deployment task. Example: "deploy".'),
        payload: z
            .union([z.record(z.string(), z.unknown()), z.string()])
            .optional()
            .describe('The payload passed when the deployment was created.'),
        environment: z.string().optional().describe('The target environment of the deployment.'),
        original_environment: z.string().optional().describe('The original environment specified when the deployment was created.'),
        description: z.string().nullable().optional().describe('A short description of the deployment.'),
        creator: CreatorSchema.optional().describe('The user or app that created the deployment.'),
        created_at: z.string().describe('The ISO 8601 timestamp when the deployment was created.'),
        updated_at: z.string().describe('The ISO 8601 timestamp when the deployment was last updated.'),
        statuses_url: z.string().optional().describe('The API URL for the deployment statuses.'),
        repository_url: z.string().optional().describe('The API URL for the repository.'),
        transient_environment: z.boolean().optional().describe('Whether this is a transient (short-lived) environment.'),
        production_environment: z.boolean().optional().describe('Whether this is a production environment.')
    })
    .describe('The deployment object returned by GitHub after creation.');

/**
 * @tags: [write]
 * @tagReason: Creates a new deployment on the repository.
 * @pitfalls: GitHub defaults auto_merge to true, which merges the default branch into the requested ref before deploying, and requires all commit statuses to pass unless required_contexts is provided as an empty array.
 */
const action = createAction({
    description: 'Create a new deployment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo', 'deployments'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.github.com/rest/deployments/deployments#create-a-deployment
            endpoint: `repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/deployments`,
            data: {
                ref: input.ref,
                ...(input.environment !== undefined && { environment: input.environment }),
                ...(input.auto_merge !== undefined && { auto_merge: input.auto_merge }),
                ...(input.required_contexts !== undefined && { required_contexts: input.required_contexts })
            },
            retries: 1
        });

        const deployment = OutputSchema.parse(response.data);
        return deployment;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
