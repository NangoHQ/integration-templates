import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    q: z.string().optional().describe('Searches for groups with a name that begins with the specified value.'),
    filter: z.string().optional().describe('Filter expression for groups.'),
    search: z.string().optional().describe('Searches for groups with supported search specifications.'),
    limit: z.number().optional().describe('Number of groups to return per page. Default is 200.')
});

const GroupProfileSchema = z
    .object({
        name: z.string(),
        description: z.string().optional()
    })
    .passthrough();

const GroupSchema = z
    .object({
        id: z.string().describe('Group ID. Example: "00g14u78ldnusLh9Y698"'),
        created: z.string().optional().describe('ISO 8601 creation timestamp.'),
        lastUpdated: z.string().optional().describe('ISO 8601 last update timestamp.'),
        lastMembershipUpdated: z.string().optional().describe('ISO 8601 last membership update timestamp.'),
        objectClass: z.array(z.string()).optional(),
        type: z.string().optional(),
        profile: GroupProfileSchema.optional()
    })
    .passthrough();

function getHeaderValue(headers: unknown, name: string): string | undefined {
    if (typeof headers !== 'object' || headers === null) {
        return undefined;
    }
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === name.toLowerCase()) {
            return typeof value === 'string' ? value : undefined;
        }
    }
    return undefined;
}

function extractNextCursor(headers: unknown): string | undefined {
    const linkHeader = getHeaderValue(headers, 'link');
    if (!linkHeader) {
        return undefined;
    }

    const parts = linkHeader.split(',');
    for (const part of parts) {
        const match = part.trim().match(/<([^>]+)>;\s*rel="next"/);
        if (match && match[1]) {
            const url = new URL(match[1]);
            const after = url.searchParams.get('after');
            if (after) {
                return after;
            }
        }
    }

    return undefined;
}

const OutputSchema = z.object({
    items: z.array(GroupSchema),
    nextCursor: z.string().optional().describe('Pagination cursor for the next page.')
});

const action = createAction({
    description: 'List groups.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.groups.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.okta.com/docs/reference/api/groups/
            endpoint: '/api/v1/groups',
            params: {
                ...(input.cursor !== undefined && { after: input.cursor }),
                ...(input.q !== undefined && { q: input.q }),
                ...(input.filter !== undefined && { filter: input.filter }),
                ...(input.search !== undefined && { search: input.search }),
                ...(input.limit !== undefined && { limit: input.limit })
            },
            retries: 3
        });

        const items = z.array(GroupSchema).parse(response.data);
        const nextCursor = extractNextCursor(response.headers);

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
