import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization whose environments should be listed. Example: "nangodev".'),
        visibility: z
            .enum(['all', 'hidden', 'visible'])
            .optional()
            .describe(
                'Filter environments by visibility. "visible" (the API default) excludes hidden environments, "hidden" returns only hidden ones, "all" returns both. Omit to use the API default.'
            )
    })
    .describe("Input for listing an organization's environments.");

const EnvironmentSchema = z.object({
    id: z.string().describe('The Sentry-assigned ID of the environment. Example: "1".'),
    name: z.string().describe('The environment name as reported by events and deploys. Example: "production".')
});

const OutputSchema = z
    .object({
        environments: z
            .array(EnvironmentSchema)
            .describe('Environments known to the organization. Empty when no event or deploy has referenced an environment yet.')
    })
    .describe('List of environments known to the organization.');

/**
 * @tags: [read]
 * @tagReason: Performs a single idempotent GET against the Sentry API and changes nothing on the provider.
 * @pitfalls: Environments are created implicitly by ingested events and deploys rather than directly, so a new or inactive organization returns an empty list.
 */
const action = createAction({
    description: 'List environment names known to the organization',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['org:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/environments/list-an-organizations-environments
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/environments/`,
            params: {
                ...(input.visibility !== undefined && { visibility: input.visibility })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const environments = z.array(EnvironmentSchema).parse(response.data);

        return { environments };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
