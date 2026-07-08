import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    q: z.string().optional().describe('Finds users whose firstName, lastName, or email begins with the specified value'),
    filter: z.string().optional().describe('Filter expression for filtering users'),
    search: z.string().optional().describe('Elasticsearch-style query'),
    limit: z.number().optional().describe('Results per page'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const UserSchema = z
    .object({
        id: z.string(),
        status: z.string().optional(),
        created: z.string().optional(),
        activated: z.string().nullable().optional(),
        statusChanged: z.string().nullable().optional(),
        lastLogin: z.string().nullable().optional(),
        lastUpdated: z.string().optional(),
        passwordChanged: z.string().nullable().optional(),
        type: z
            .object({
                id: z.string().optional()
            })
            .passthrough()
            .optional(),
        profile: z.record(z.string(), z.unknown()).optional(),
        credentials: z.record(z.string(), z.unknown()).optional(),
        _links: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    users: z.array(UserSchema),
    next_cursor: z.string().optional()
});

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

const action = createAction({
    description: 'List users.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.users.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.q !== undefined) {
            params['q'] = input.q;
        }
        if (input.filter !== undefined) {
            params['filter'] = input.filter;
        }
        if (input.search !== undefined) {
            params['search'] = input.search;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.cursor !== undefined) {
            params['after'] = input.cursor;
        }

        const response = await nango.get({
            // https://developer.okta.com/docs/reference/api/users/#list-users
            endpoint: '/api/v1/users',
            params,
            retries: 3
        });

        const users = z.array(UserSchema).parse(response.data);

        let next_cursor: string | undefined;
        const linkHeader = getHeaderValue(response.headers, 'link');
        if (typeof linkHeader === 'string') {
            const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
            if (nextMatch && nextMatch[1] !== undefined) {
                const nextUrl = new URL(nextMatch[1]);
                const after = nextUrl.searchParams.get('after');
                if (after !== null) {
                    next_cursor = after;
                }
            }
        }

        return {
            users,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
