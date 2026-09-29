import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the project belongs to. Example: "nangodev"'),
        project_id_or_slug: z
            .string()
            .describe(
                'The ID or slug of the project the environment belongs to. Project slugs are unique within each organization. Example: "nango-seed-project"'
            ),
        environment: z.string().describe('The name of the environment to retrieve. Example: "production"')
    })
    .describe('Identifiers locating the project environment to retrieve');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the environment. Example: "1"'),
        name: z.string().describe('Name of the environment. Example: "production"'),
        isHidden: z.boolean().describe('Whether the environment is hidden in Sentry. Example: false')
    })
    .describe('The retrieved project environment');

/**
 * @tags: [read]
 * @tagReason: Only performs a read-only GET to fetch a single project environment; makes no provider mutations.
 * @pitfalls: Environments are created implicitly by ingested events or deploys, not through a dedicated create endpoint, so querying a well-formed name that has never been referenced returns a not-found error.
 */
const action = createAction({
    description: 'Retrieve a single project environment by name',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/environments/retrieve-a-project-environment/
        const response = await nango.get({
            endpoint: `/0/projects/${encodeURIComponent(input.organization_id_or_slug)}/${encodeURIComponent(input.project_id_or_slug)}/environments/${encodeURIComponent(input.environment)}/`,
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
