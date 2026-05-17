import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// https://developer.calendly.com/api-docs/343d482089c58-calendly-api#get-scheduled-events
const ScheduledEventSchema = z.object({
    id: z.string(),
    uri: z.string(),
    name: z.string().optional(),
    status: z.enum(['active', 'canceled']).optional(),
    start_time: z.string(),
    end_time: z.string(),
    event_type: z.string().optional(),
    location: z
        .object({
            type: z.string().optional(),
            location: z.string().optional()
        })
        .optional(),
    invitees_counter: z
        .object({
            total: z.number().optional(),
            active: z.number().optional(),
            limit_reached: z.boolean().optional()
        })
        .optional(),
    created_at: z.string(),
    updated_at: z.string(),
    event_type_name: z.string().optional(),
    event_guests: z
        .array(
            z.object({
                email: z.string().optional(),
                display_name: z.string().optional()
            })
        )
        .optional(),
    calendar_event: z
        .object({
            kind: z.string().optional(),
            external_id: z.string().optional()
        })
        .optional(),
    cancellation: z
        .object({
            canceled_by: z.string().optional(),
            reason: z.string().optional(),
            canceler_type: z.string().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    min_start_time: z.string(),
    page_token: z.string()
});

function toCalendlyTimestamp(date: Date): string {
    return date.toISOString().replace(/\.(\d{3})Z$/, '.$1000Z');
}

const sync = createSync({
    description: 'Sync scheduled events from Calendly',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    endpoints: [
        {
            path: '/scheduled-events',
            method: 'GET'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        ScheduledEvent: ScheduledEventSchema
    },

    exec: async (nango) => {
        const currentRunStartTime = toCalendlyTimestamp(new Date());

        // https://developer.calendly.com/api-docs/343d482089c58-calendly-api#get-current-user
        const userResponse = await nango.get({
            endpoint: '/users/me',
            retries: 3
        });

        const userData = userResponse.data;
        if (
            typeof userData !== 'object' ||
            userData === null ||
            !('resource' in userData) ||
            typeof userData.resource !== 'object' ||
            userData.resource === null ||
            !('uri' in userData.resource) ||
            typeof userData.resource.uri !== 'string'
        ) {
            throw new Error('Failed to get user URI from Calendly API');
        }

        const userUri = userData.resource.uri;

        const rawCheckpoint = await nango.getCheckpoint();
        const minStartTime = typeof rawCheckpoint?.min_start_time === 'string' ? rawCheckpoint.min_start_time : '';
        let pageToken = typeof rawCheckpoint?.page_token === 'string' ? rawCheckpoint.page_token : '';

        const params: Record<string, string | number> = {
            user: userUri,
            count: 100,
            sort: 'start_time:asc'
        };

        if (minStartTime) {
            params['min_start_time'] = minStartTime;
        }

        if (pageToken) {
            params['page_token'] = pageToken;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.calendly.com/api-docs/343d482089c58-calendly-api#get-scheduled-events
            endpoint: '/scheduled_events',
            params,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'page_token',
                cursor_path_in_response: 'pagination.next_page_token',
                response_path: 'collection',
                on_page: async ({ nextPageParam }) => {
                    pageToken = typeof nextPageParam === 'string' ? nextPageParam : '';
                }
            },
            retries: 3
        };

        for await (const events of nango.paginate<{
            uri: string;
            name?: string;
            status?: 'active' | 'canceled';
            start_time: string;
            end_time: string;
            event_type?: string;
            location?: {
                type?: string;
                location?: string;
            };
            invitees_counter?: {
                total?: number;
                active?: number;
                limit_reached?: boolean;
            };
            created_at: string;
            updated_at: string;
            event_type_name?: string;
            event_guests?: Array<{
                email?: string;
                display_name?: string;
            }>;
            calendar_event?: {
                kind?: string;
                external_id?: string;
            };
            cancellation?: {
                canceled_by?: string;
                reason?: string;
                canceler_type?: string;
            };
        }>(proxyConfig)) {
            const mappedEvents = events.map((event) => {
                const id = event.uri.split('/').pop() ?? event.uri;
                return {
                    id,
                    uri: event.uri,
                    name: event.name,
                    status: event.status,
                    start_time: event.start_time,
                    end_time: event.end_time,
                    event_type: event.event_type,
                    location: event.location,
                    invitees_counter: event.invitees_counter,
                    created_at: event.created_at,
                    updated_at: event.updated_at,
                    event_type_name: event.event_type_name,
                    event_guests: event.event_guests,
                    calendar_event: event.calendar_event,
                    cancellation: event.cancellation
                };
            });

            if (mappedEvents.length > 0) {
                await nango.batchSave(mappedEvents, 'ScheduledEvent');
            }

            if (pageToken) {
                await nango.saveCheckpoint({
                    min_start_time: minStartTime,
                    page_token: pageToken
                });
            }
        }

        await nango.saveCheckpoint({
            min_start_time: currentRunStartTime,
            page_token: ''
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
