import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// https://developer.calendly.com/api-docs/25a4ece03c1bc-list-user-s-event-types
const EventTypeSchema = z.object({
    id: z.string().describe('Unique identifier for the event type'),
    uri: z.string().describe('Canonical reference for the event type'),
    name: z.string().optional().describe('Event type name'),
    active: z.boolean().describe('Indicates if the event type is active'),
    booking_method: z.enum(['instant', 'poll']).optional().describe('Booking method'),
    color: z.string().optional().describe('Hex color value'),
    created_at: z.string().describe('Creation timestamp'),
    updated_at: z.string().describe('Last update timestamp'),
    deleted_at: z.string().optional().describe('Deletion timestamp if deleted'),
    description_plain: z.string().optional().describe('Plain text description'),
    description_html: z.string().optional().describe('HTML description'),
    duration: z.number().optional().describe('Session duration in minutes'),
    kind: z.enum(['solo']).optional().describe('Event type kind'),
    pooling_type: z.enum(['round_robin', 'collective', 'multi_pool']).optional().nullable().describe('Pooling type for team event types'),
    position: z.number().optional().describe('Display position'),
    scheduling_url: z.string().optional().describe('Booking URL'),
    slug: z.string().optional().describe('URL slug'),
    type: z.enum(['StandardEventType', 'AdhocEventType']).optional().describe('Event type category')
});

const CheckpointSchema = z.object({
    page_token: z.string().describe('Pagination token for resuming the current full refresh')
});

// Schema for raw API response (prefixed with _ since only used for typing)
const _CalendlyEventTypeSchema = z.object({
    uri: z.string(),
    name: z.string().optional(),
    active: z.boolean(),
    booking_method: z.enum(['instant', 'poll']).optional(),
    color: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    deleted_at: z.string().nullable().optional(),
    description_plain: z.string().nullable().optional(),
    description_html: z.string().nullable().optional(),
    duration: z.number().optional(),
    kind: z.enum(['solo']).optional(),
    pooling_type: z.enum(['round_robin', 'collective', 'multi_pool']).optional().nullable(),
    position: z.number().optional(),
    scheduling_url: z.string().optional(),
    slug: z.string().optional(),
    type: z.enum(['StandardEventType', 'AdhocEventType']).optional()
});

// Schema for current user response
const _UserSchema = z.object({
    resource: z.object({
        uri: z.string()
    })
});

type EventType = z.infer<typeof EventTypeSchema>;
type CalendlyEventType = z.infer<typeof _CalendlyEventTypeSchema>;

const sync = createSync<{ EventType: typeof EventTypeSchema }, undefined, typeof CheckpointSchema>({
    description: 'Sync event types from Calendly',
    version: '4.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/event-types'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        EventType: EventTypeSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        let pageToken = typeof rawCheckpoint?.page_token === 'string' ? rawCheckpoint.page_token : '';

        // https://developer.calendly.com/api-docs/e22b6fd2c47b3-get-current-user
        const userResponse = await nango.get({
            endpoint: '/users/me',
            retries: 3
        });

        const parsedUser = _UserSchema.safeParse(userResponse.data);
        if (!parsedUser.success) {
            throw new Error('Failed to parse user response');
        }
        const userUri = parsedUser.data.resource.uri;

        await nango.trackDeletesStart('EventType');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.calendly.com/api-docs/25a4ece03c1bc-list-user-s-event-types
            endpoint: '/event_types',
            params: {
                user: userUri,
                sort: 'name:asc',
                ...(pageToken && { page_token: pageToken })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'page_token',
                cursor_path_in_response: 'pagination.next_page_token',
                response_path: 'collection',
                limit: 100,
                limit_name_in_request: 'count',
                on_page: async ({ nextPageParam }) => {
                    pageToken = typeof nextPageParam === 'string' ? nextPageParam : '';
                }
            },
            retries: 3
        };

        try {
            for await (const page of nango.paginate<CalendlyEventType>(proxyConfig)) {
                const upserts: EventType[] = [];

                for (const item of page) {
                    if (item.deleted_at) {
                        continue;
                    }

                    const uriParts = item.uri.split('/');
                    const id = uriParts[uriParts.length - 1];
                    if (!id) {
                        continue;
                    }

                    upserts.push({
                        id,
                        uri: item.uri,
                        name: item.name,
                        active: item.active,
                        booking_method: item.booking_method,
                        color: item.color,
                        created_at: item.created_at,
                        updated_at: item.updated_at,
                        ...(item.deleted_at != null && { deleted_at: item.deleted_at }),
                        ...(item.description_plain != null && { description_plain: item.description_plain }),
                        ...(item.description_html != null && { description_html: item.description_html }),
                        duration: item.duration,
                        kind: item.kind,
                        pooling_type: item.pooling_type,
                        position: item.position,
                        scheduling_url: item.scheduling_url,
                        slug: item.slug,
                        type: item.type
                    });
                }

                if (upserts.length > 0) {
                    await nango.batchSave(upserts, 'EventType');
                }

                if (pageToken) {
                    await nango.saveCheckpoint({ page_token: pageToken });
                }
            }

            await nango.saveCheckpoint({ page_token: '' });
        } finally {
            await nango.trackDeletesEnd('EventType');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
