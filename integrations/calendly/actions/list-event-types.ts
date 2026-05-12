import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user: z.string().optional().describe('Filter by user URI. Example: "https://api.calendly.com/users/ABC123"'),
    organization: z.string().optional().describe('Filter by organization URI. Example: "https://api.calendly.com/organizations/XYZ789"'),
    active: z.boolean().optional().describe('Filter by active status. If true, returns only active event types. If false, returns only inactive event types.'),
    count: z.number().int().min(1).max(100).optional().describe('Number of results per page. Maximum 100.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    sort: z.string().optional().describe('Sort order. Example: "created_at:asc" or "created_at:desc".')
});

const ProfileSchema = z.object({
    name: z.string(),
    type: z.string(),
    owner: z.string()
});

const EventTypeSchema = z.object({
    uri: z.string(),
    active: z.boolean(),
    booking_method: z.string(),
    color: z.string(),
    created_at: z.string(),
    description_html: z.string().nullable(),
    duration: z.number(),
    internal_note: z.string().nullable(),
    kind: z.string(),
    name: z.string(),
    pooling_type: z.string().nullable(),
    profile: ProfileSchema,
    scheduling_url: z.string(),
    slug: z.string(),
    type: z.string()
});

const PaginationSchema = z.object({
    next_page: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    collection: z.array(EventTypeSchema),
    pagination: PaginationSchema.optional()
});

const OutputSchema = z.object({
    event_types: z.array(EventTypeSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List event types from Calendly.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-event-types',
        group: 'Event Types'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['event_types:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.user !== undefined) {
            params['user'] = input.user;
        }
        if (input.organization !== undefined) {
            params['organization'] = input.organization;
        }
        if (input.active !== undefined) {
            params['active'] = input.active ? 'true' : 'false';
        }
        if (input.count !== undefined) {
            params['count'] = input.count;
        }
        if (input.cursor !== undefined) {
            params['page_token'] = input.cursor;
        }
        if (input.sort !== undefined) {
            params['sort'] = input.sort;
        }

        // https://developer.calendly.com/api-docs/b3A6NTkxNDEz-list-user-s-event-types
        const response = await nango.get({
            endpoint: '/event_types',
            params: params,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        const nextCursor = providerData.pagination?.next_page;

        return {
            event_types: providerData.collection,
            ...(nextCursor !== undefined && nextCursor !== null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
