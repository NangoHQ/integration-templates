import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the release belongs to. Example: "nangodev"'),
        version: z.string().describe('The version identifier of the release being deployed. Example: "nango-seed-1.0.0"'),
        environment: z.string().describe('The environment you are deploying to. Example: "production"'),
        name: z.string().optional().describe('Optional human-readable name of the deploy. Example: "Deploy 42"'),
        url: z.string().optional().describe('Optional URL that points to the deploy. Example: "https://example.com/deploys/42"'),
        dateStarted: z.string().optional().describe('Optional ISO 8601 datetime indicating when the deploy started. Example: "2026-09-29T12:00:00Z"'),
        dateFinished: z
            .string()
            .optional()
            .describe(
                'Optional ISO 8601 datetime indicating when the deploy ended. Defaults to the current time when omitted. Example: "2026-09-29T12:05:00Z"'
            ),
        projects: z
            .array(z.string())
            .optional()
            .describe(
                'Optional list of project slugs to create the deploy within. When omitted, the deploy is created for all of the release\'s projects. Example: ["nango-seed-project"]'
            )
    })
    .describe('Input for recording a new deploy of a Sentry release to an environment');

const DeploySchema = z.object({
    id: z.string(),
    environment: z.string(),
    dateStarted: z.string().nullable(),
    dateFinished: z.string(),
    name: z.string().nullable(),
    url: z.string().nullable()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The ID of the created deploy.'),
        environment: z.string().describe('The environment the release was deployed to.'),
        dateStarted: z.string().optional().describe('ISO 8601 datetime indicating when the deploy started. Omitted when not set.'),
        dateFinished: z.string().describe('ISO 8601 datetime indicating when the deploy ended.'),
        name: z.string().optional().describe('Human-readable name of the deploy. Omitted when not set.'),
        url: z.string().optional().describe('URL that points to the deploy. Omitted when not set.')
    })
    .describe('The created Sentry deploy');

/**
 * @tags: [write]
 * @tagReason: Creates a new deploy record for a release in Sentry via a POST mutation.
 * @pitfalls: Deploys cannot be deleted once created, and deploying to an environment name that does not exist yet implicitly creates that environment. Creating the deploy fails unless the caller has access to all projects associated with the release.
 */
const action = createAction({
    description: 'Record a new deploy of a release to an environment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/releases/create-a-deploy
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/releases/${encodeURIComponent(input.version)}/deploys/`,
            data: {
                environment: input.environment,
                ...(input.name !== undefined && { name: input.name }),
                ...(input.url !== undefined && { url: input.url }),
                ...(input.dateStarted !== undefined && { dateStarted: input.dateStarted }),
                ...(input.dateFinished !== undefined && { dateFinished: input.dateFinished }),
                ...(input.projects !== undefined && { projects: input.projects })
            },
            // Non-idempotent create: retrying after a lost response would record duplicate deploys.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };

        const response = await nango.post(config);
        const deploy = DeploySchema.parse(response.data);

        return {
            id: deploy.id,
            environment: deploy.environment,
            ...(deploy.dateStarted != null && { dateStarted: deploy.dateStarted }),
            dateFinished: deploy.dateFinished,
            ...(deploy.name != null && { name: deploy.name }),
            ...(deploy.url != null && { url: deploy.url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
