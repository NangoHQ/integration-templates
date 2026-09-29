import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the project belongs to. Example: "my-org"'),
        project_id_or_slug: z
            .string()
            .describe('The ID or slug of the project whose environments to list. Project slugs are unique within each organization. Example: "my-project"'),
        visibility: z
            .enum(['all', 'hidden', 'visible'])
            .optional()
            .describe(
                'Which environments to include: "visible" (the default, excludes hidden environments), "all" (includes hidden environments), or "hidden" (only hidden environments).'
            )
    })
    .describe("Input for listing a project's environments.");

const EnvironmentSchema = z.object({
    id: z.string().describe('The Sentry environment ID, returned as a string. Example: "1"'),
    name: z.string().describe('The environment name. Example: "production"'),
    isHidden: z.boolean().describe('Whether the environment is hidden.')
});

const OutputSchema = z
    .object({
        environments: z.array(EnvironmentSchema).describe("The project's environments, filtered by the requested visibility.")
    })
    .describe("Output for listing a project's environments.");

/**
 * @tags: [read]
 * @tagReason: Performs a single GET request that only reads the project's environments.
 * @pitfalls: Hidden environments are excluded unless visibility is set to "all" or "hidden"; the provider default is "visible". Environments are created implicitly by deploys or ingested events rather than directly, so a project that has none yet returns an empty list.
 */
const action = createAction({
    description: "List a project's environments (including hidden ones only when requested).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/environments/list-a-projects-environments/
        const response = await nango.get({
            endpoint: `/0/projects/${encodeURIComponent(input.organization_id_or_slug)}/${encodeURIComponent(input.project_id_or_slug)}/environments/`,
            params: {
                ...(input.visibility !== undefined && { visibility: input.visibility })
            },
            retries: 3
        });

        const environments = z.array(EnvironmentSchema).parse(response.data);

        return { environments };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
