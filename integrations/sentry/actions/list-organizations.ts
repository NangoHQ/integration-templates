import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().min(1).optional().describe('Pagination cursor from a previous response. Omit for the first page. Example: "100:0:1"')
    })
    .describe('Pagination input for listing organizations accessible to the connected account.');

const OrganizationSchema = z.object({
    id: z.string().describe('Numeric organization ID as a string. Example: "4512170041409536"'),
    slug: z.string().describe('URL-friendly organization slug used in Sentry API paths. Example: "nangodev"'),
    name: z.string().describe('Human-readable organization name. Example: "Nango Dev"'),
    status: z
        .object({
            id: z.string().describe('Organization status ID. Example: "active"'),
            name: z.string().describe('Human-readable organization status name. Example: "active"')
        })
        .describe('Organization status.'),
    dateCreated: z.string().describe('ISO 8601 timestamp of when the organization was created. Example: "2026-09-29T15:00:00.000000Z"')
});

const OutputSchema = z
    .object({
        organizations: z.array(OrganizationSchema).describe('Organizations accessible to the connected account.'),
        nextCursor: z
            .string()
            .optional()
            .describe('Cursor to fetch the next page of results. Present only when more results exist; pass it back as the cursor input.')
    })
    .describe('Organizations accessible to the connected account, with pagination state.');

const ProviderOrganizationSchema = z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    status: z.object({
        id: z.string(),
        name: z.string()
    }),
    dateCreated: z.string()
});

function parseNextCursor(linkHeader: unknown): string | undefined {
    if (typeof linkHeader !== 'string') {
        return undefined;
    }
    for (const segment of linkHeader.split(',')) {
        if (!/rel="next"/.test(segment) || !/results="true"/.test(segment)) {
            continue;
        }
        const cursorMatch = segment.match(/cursor="([^"]+)"/);
        if (cursorMatch && cursorMatch[1]) {
            return cursorMatch[1];
        }
    }
    return undefined;
}

/**
 * @tags: [read]
 * @tagReason: Only fetches organizations with a single GET request; performs no provider mutations.
 * @pitfalls: API token connections only return the organization the token belongs to, so expect a one-item list with no next page. Results are limited to organizations in the connection's region.
 */
const action = createAction({
    description: 'List organizations accessible to the connected account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['org:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/users/list-your-organizations/
            endpoint: '/0/organizations/',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        };
        const response = await nango.get(config);

        const organizations = z.array(ProviderOrganizationSchema).parse(response.data);
        const nextCursor = parseNextCursor(response.headers['link']);

        return {
            organizations,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
