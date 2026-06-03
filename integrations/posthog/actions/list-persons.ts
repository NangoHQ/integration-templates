import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('PostHog project ID. Example: "309484"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    distinct_id: z.string().optional().describe('Filter by distinct ID.'),
    email: z.string().optional().describe('Filter by email.'),
    search: z.string().optional().describe('Search query string.'),
    properties: z.array(z.unknown()).optional().describe('Filter by properties.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of results to return per page.')
});

const ProviderPersonSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    distinct_ids: z.array(z.string()).optional(),
    properties: z.record(z.string(), z.unknown()).nullable().optional(),
    created_at: z.string().optional(),
    uuid: z.string().optional(),
    last_seen_at: z.string().nullable().optional()
});

const OutputSchema = z.object({
    persons: z.array(
        z.object({
            id: z.string(),
            name: z.string().optional(),
            distinct_ids: z.array(z.string()).optional(),
            properties: z.record(z.string(), z.unknown()).optional(),
            created_at: z.string().optional(),
            uuid: z.string().optional(),
            last_seen_at: z.string().optional()
        })
    ),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List persons from PostHog.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-persons',
        group: 'Persons'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['person:read'],

    exec: async (nango, input) => {
        const projectId = input.project_id;

        const params: Record<string, string | number> = {
            ...(input.cursor !== undefined && { cursor: input.cursor }),
            ...(input.distinct_id !== undefined && { distinct_id: input.distinct_id }),
            ...(input.email !== undefined && { email: input.email }),
            ...(input.search !== undefined && { search: input.search }),
            ...(input.properties !== undefined && { properties: JSON.stringify(input.properties) }),
            ...(input.limit !== undefined && { limit: input.limit })
        };

        const config: ProxyConfiguration = {
            // https://posthog.com/docs/api/persons
            endpoint: `/api/projects/${encodeURIComponent(projectId)}/persons/`,
            params,
            retries: 3
        };
        const response = await nango.get(config);

        const ProviderListResponseSchema = z.object({
            results: z.array(z.unknown()),
            next: z.string().nullable().optional(),
            previous: z.string().nullable().optional()
        });

        const providerResponse = ProviderListResponseSchema.parse(response.data);

        const persons: z.infer<typeof OutputSchema>['persons'] = [];
        for (const item of providerResponse.results) {
            const parsed = ProviderPersonSchema.safeParse(item);
            if (!parsed.success) {
                continue;
            }
            const person = parsed.data;
            persons.push({
                id: person.id,
                ...(person.name != null && { name: person.name }),
                ...(person.distinct_ids !== undefined && { distinct_ids: person.distinct_ids }),
                ...(person.properties != null && { properties: person.properties }),
                ...(person.created_at !== undefined && { created_at: person.created_at }),
                ...(person.uuid !== undefined && { uuid: person.uuid }),
                ...(person.last_seen_at != null && { last_seen_at: person.last_seen_at })
            });
        }

        let next_cursor: string | undefined;
        if (providerResponse.next) {
            const match = providerResponse.next.match(/[?&]cursor=([^&]+)/);
            if (match && match[1]) {
                next_cursor = decodeURIComponent(match[1]);
            }
        }

        return {
            persons,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
