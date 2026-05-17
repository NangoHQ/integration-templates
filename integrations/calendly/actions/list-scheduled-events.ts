import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    min_start_time: z.string().optional().describe('Minimum start time for events in ISO 8601 format. Example: "2024-01-01T00:00:00Z"'),
    max_start_time: z.string().optional().describe('Maximum start time for events in ISO 8601 format. Example: "2024-12-31T23:59:59Z"'),
    status: z.enum(['active', 'canceled']).optional().describe('Filter events by status: "active" or "canceled"'),
    invitee_email: z.string().optional().describe('Filter events by invitee email address'),
    sort: z.enum(['start_time:asc', 'start_time:desc']).optional().describe('Sort order for events. Default is "start_time:asc"'),
    count: z.number().int().min(1).max(100).optional().describe('Number of events to return per page (max 100)'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const InviteesCounterSchema = z.object({
    active: z.number(),
    limit: z.number(),
    total: z.number()
});

const LocationSchema = z
    .object({
        type: z.string(),
        status: z.string().optional(),
        location: z.string().optional(),
        join_url: z.string().optional()
    })
    .passthrough();

const EventSchema = z
    .object({
        uri: z.string(),
        name: z.string().optional(),
        status: z.enum(['active', 'canceled']),
        start_time: z.string(),
        end_time: z.string(),
        event_type: z.string(),
        location: LocationSchema.nullable(),
        invitees_counter: InviteesCounterSchema,
        created_at: z.string(),
        updated_at: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    events: z.array(EventSchema),
    next_cursor: z.string().optional()
});

const ListResponseSchema = z.object({
    collection: z.array(z.record(z.string(), z.unknown())),
    pagination: z
        .object({
            count: z.number(),
            next_page_token: z.string().nullable().optional()
        })
        .optional()
});

const action = createAction({
    description: 'List scheduled events from Calendly. Returns a paginated list of events with optional filters for date range, status, and invitee email.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-scheduled-events',
        group: 'Scheduled Events'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['scheduling:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.calendly.com/api-docs/9746674c5680c-get-current-user
        const userResponse = await nango.get({
            endpoint: '/users/me',
            retries: 3
        });

        const userUri = typeof userResponse.data.resource?.uri === 'string' ? userResponse.data.resource.uri : undefined;
        if (!userUri) {
            throw new nango.ActionError({
                type: 'missing_user_uri',
                message: 'Failed to get current user URI from Calendly'
            });
        }

        const response = await nango.get({
            // https://developer.calendly.com/api-docs/aa1c2c2e2bb38-list-events-for-an-organization
            endpoint: '/scheduled_events',
            params: {
                user: userUri,
                ...(input.min_start_time && { min_start_time: input.min_start_time }),
                ...(input.max_start_time && { max_start_time: input.max_start_time }),
                ...(input.status && { status: input.status }),
                ...(input.invitee_email && { invitee_email: input.invitee_email }),
                ...(input.sort && { sort: input.sort }),
                ...(input.count && { count: input.count.toString() }),
                ...(input.cursor && { page_token: input.cursor })
            },
            retries: 3
        });

        const validatedResponse = ListResponseSchema.parse(response.data);

        const events: Array<z.infer<typeof EventSchema>> = [];
        for (const item of validatedResponse.collection) {
            const parsed = EventSchema.safeParse(item);
            if (parsed.success) {
                events.push(parsed.data);
            }
        }

        return {
            events,
            ...(validatedResponse.pagination?.next_page_token && {
                next_cursor: validatedResponse.pagination.next_page_token
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
