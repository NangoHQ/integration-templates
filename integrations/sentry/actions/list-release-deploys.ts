import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the Sentry organization the release belongs to. Example: "my-org"'),
        version: z.string().describe('The version identifier of the release whose deploys should be listed. Example: "1.0.0"'),
        cursor: z.string().optional().describe('Pagination cursor returned as nextCursor by a previous call. Omit to fetch the first page.')
    })
    .describe('Input for listing the deploys recorded for a release.');

const DeploySchema = z.object({
    id: z.string().describe('The unique identifier of the deploy.'),
    environment: z.string().describe('The name of the environment the deploy was recorded in. Example: "production"'),
    dateStarted: z.string().optional().describe('ISO 8601 timestamp indicating when the deploy started. Omitted when the deploy recorded no start time.'),
    dateFinished: z.string().describe('ISO 8601 timestamp indicating when the deploy ended. Example: "2026-09-29T12:00:00Z"'),
    name: z.string().optional().describe('The optional human-readable name of the deploy. Omitted when unset.'),
    url: z.string().optional().describe('Optional URL pointing to the deploy. Omitted when unset.')
});

const OutputSchema = z
    .object({
        deploys: z.array(DeploySchema).describe('The deploys recorded for the release.'),
        nextCursor: z
            .string()
            .optional()
            .describe('Pagination cursor for the next page of deploys; pass it as cursor on the next call. Omitted when no further results exist.')
    })
    .describe('The deploys recorded for the release along with the cursor for the next page.');

const ProviderDeploySchema = z.object({
    id: z.string(),
    environment: z.string(),
    dateStarted: z.string().nullable(),
    dateFinished: z.string(),
    name: z.string().nullable(),
    url: z.string().nullable()
});

function extractNextCursor(linkHeader: string | undefined): string | undefined {
    if (!linkHeader) {
        return undefined;
    }
    for (const part of linkHeader.split(',')) {
        if (part.includes('rel="next"') && part.includes('results="true"')) {
            const match = /cursor="([^"]+)"/.exec(part);
            const cursor = match?.[1];
            if (cursor) {
                return cursor;
            }
        }
    }
    return undefined;
}

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET that lists the deploys of a release and never mutates provider state.
 * @pitfalls: The release is identified by its version string, not its numeric release ID.
 */
const action = createAction({
    description: 'List the deploys recorded for a release.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['org:ci', 'project:admin', 'project:read', 'project:releases', 'project:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/releases/list-a-releases-deploys/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/releases/${encodeURIComponent(input.version)}/deploys/`,
            params: {
                ...(input.cursor && { cursor: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const providerDeploys = z.array(ProviderDeploySchema).parse(response.data);

        const linkHeader = response.headers['link'];
        const nextCursor = extractNextCursor(typeof linkHeader === 'string' ? linkHeader : undefined);

        return {
            deploys: providerDeploys.map((deploy) => ({
                id: deploy.id,
                environment: deploy.environment,
                ...(deploy.dateStarted != null && { dateStarted: deploy.dateStarted }),
                dateFinished: deploy.dateFinished,
                ...(deploy.name != null && { name: deploy.name }),
                ...(deploy.url != null && { url: deploy.url })
            })),
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
