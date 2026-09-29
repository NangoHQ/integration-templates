import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        owner: z.string().describe('The account owner of the repository. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('The name of the repository. Example: "nango"'),
        ref: z.string().describe('The ref to deploy. Can be a branch name, tag, or commit SHA. Example: "master"'),
        environment: z
            .string()
            .optional()
            .describe('Name of the target deployment environment. Defaults to "production" on GitHub when omitted. Example: "nango-registry-test"'),
        auto_merge: z
            .boolean()
            .optional()
            .describe(
                'Whether GitHub should attempt to automatically merge the default branch into the requested ref when it is behind. Defaults to true on GitHub.'
            ),
        required_contexts: z
            .array(z.string())
            .optional()
            .describe(
                'Commit status contexts that must be green before the deployment is created. Pass an empty array to bypass the default requirement that all commit statuses on the ref succeed.'
            )
    })
    .describe('Input for creating a GitHub deployment');

const ProviderCreatorSchema = z.object({
    login: z.string(),
    id: z.number(),
    node_id: z.string(),
    avatar_url: z.string(),
    html_url: z.string()
});

const ProviderDeploymentSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    url: z.string(),
    sha: z.string(),
    ref: z.string(),
    task: z.string().optional(),
    payload: z.unknown().optional(),
    original_environment: z.string(),
    environment: z.string(),
    description: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    statuses_url: z.string(),
    repository_url: z.string(),
    transient_environment: z.boolean().optional(),
    production_environment: z.boolean().optional(),
    creator: ProviderCreatorSchema
});

const CreatorSchema = z
    .object({
        login: z.string().describe('Username of the deployment creator.'),
        id: z.number().describe('Unique identifier of the creator user.'),
        node_id: z.string().describe('Global node ID of the creator user.'),
        avatar_url: z.string().describe('Avatar URL of the creator.'),
        html_url: z.string().describe('GitHub profile URL of the creator.')
    })
    .describe('The user who created the deployment.');

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the deployment. Example: 5850133226'),
        node_id: z.string().describe('Node ID of the deployment.'),
        url: z.string().describe('API URL of the deployment.'),
        sha: z.string().describe('Commit SHA the deployment was created for.'),
        ref: z.string().describe('The ref that was deployed. Example: "master"'),
        task: z.string().optional().describe('The deployment task. Example: "deploy"'),
        payload: z.unknown().optional().describe('Payload attached to the deployment, when one was provided.'),
        original_environment: z.string().describe('The original environment specified when the deployment was created.'),
        environment: z.string().describe('The environment the deployment targets. Example: "nango-registry-test"'),
        description: z.string().optional().describe('Description of the deployment, when one was set.'),
        created_at: z.string().describe('ISO 8601 timestamp of when the deployment was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp of when the deployment was last updated.'),
        statuses_url: z.string().describe('API URL for listing and creating statuses of this deployment.'),
        repository_url: z.string().describe('API URL of the repository the deployment belongs to.'),
        transient_environment: z
            .boolean()
            .optional()
            .describe('Whether the deployment environment is specific to this deployment and will no longer exist at some point.'),
        production_environment: z.boolean().optional().describe('Whether the deployment environment is one that end-users directly interact with.'),
        creator: CreatorSchema.describe('The user or app that created the deployment.')
    })
    .describe('The created GitHub deployment');

/**
 * @tags: [write]
 * @tagReason: Creates a new deployment in the repository, which mutates provider state.
 * @pitfalls: When required_contexts is omitted GitHub verifies every commit status context on the ref and rejects the deployment if any is not successful; pass an empty array to skip the check. auto_merge defaults to true, so GitHub may merge the default branch into the requested ref. A new deployment has no state until a deployment status is created for it.
 */
const action = createAction({
    description: 'Create a new deployment.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deployments:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            method: 'POST',
            // https://docs.github.com/en/rest/deployments/deployments#create-a-deployment
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/deployments`,
            data: {
                ref: input.ref,
                ...(input.environment !== undefined && { environment: input.environment }),
                ...(input.auto_merge !== undefined && { auto_merge: input.auto_merge }),
                ...(input.required_contexts !== undefined && { required_contexts: input.required_contexts })
            },
            retries: 10
        };
        const response = await nango.post(config);
        const deployment = ProviderDeploymentSchema.parse(response.data);

        return {
            id: deployment.id,
            node_id: deployment.node_id,
            url: deployment.url,
            sha: deployment.sha,
            ref: deployment.ref,
            ...(deployment.task !== undefined && { task: deployment.task }),
            ...(deployment.payload !== undefined && { payload: deployment.payload }),
            original_environment: deployment.original_environment,
            environment: deployment.environment,
            ...(deployment.description != null && { description: deployment.description }),
            created_at: deployment.created_at,
            updated_at: deployment.updated_at,
            statuses_url: deployment.statuses_url,
            repository_url: deployment.repository_url,
            ...(deployment.transient_environment !== undefined && { transient_environment: deployment.transient_environment }),
            ...(deployment.production_environment !== undefined && { production_environment: deployment.production_environment }),
            creator: {
                login: deployment.creator.login,
                id: deployment.creator.id,
                node_id: deployment.creator.node_id,
                avatar_url: deployment.creator.avatar_url,
                html_url: deployment.creator.html_url
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
