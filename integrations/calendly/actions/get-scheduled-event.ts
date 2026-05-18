import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    uuid: z.string().describe('The unique identifier for the scheduled event. Example: "8pv58mskifkj5st9o6m2qqde74"')
});

const EventMembershipSchema = z.object({
    user: z.string(),
    user_email: z.string().optional(),
    user_name: z.string().optional(),
    buffered_start_time: z.string().optional(),
    buffered_end_time: z.string().optional()
});

const InviteeCounterSchema = z.object({
    active: z.number(),
    limit: z.number(),
    total: z.number()
});

const LocationSchema = z.object({
    type: z.string(),
    status: z.string().optional(),
    join_url: z.string().optional(),
    data: z.record(z.string(), z.unknown()).optional()
});

const CalendarEventSchema = z.object({
    external_id: z.string().optional(),
    kind: z.string().optional()
});

const ProviderScheduledEventSchema = z.object({
    uri: z.string(),
    event_type: z.string(),
    name: z.string(),
    status: z.enum(['active', 'canceled']),
    start_time: z.string(),
    end_time: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    event_memberships: z.array(EventMembershipSchema).optional(),
    event_guests: z.array(z.record(z.string(), z.unknown())).optional(),
    invitees_counter: InviteeCounterSchema.optional(),
    location: LocationSchema.nullable().optional(),
    calendar_event: CalendarEventSchema.nullable().optional(),
    meeting_notes_html: z.string().nullable().optional(),
    meeting_notes_plain: z.string().nullable().optional()
});

const OutputSchema = z.object({
    uri: z.string(),
    event_type: z.string(),
    name: z.string(),
    status: z.enum(['active', 'canceled']),
    start_time: z.string(),
    end_time: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    event_memberships: z.array(EventMembershipSchema).optional(),
    event_guests: z.array(z.record(z.string(), z.unknown())).optional(),
    invitees_counter: InviteeCounterSchema.optional(),
    location: LocationSchema.nullable().optional(),
    calendar_event: CalendarEventSchema.nullable().optional(),
    meeting_notes_html: z.string().nullable().optional(),
    meeting_notes_plain: z.string().nullable().optional()
});

const action = createAction({
    description: 'Retrieve a single scheduled event from Calendly',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-scheduled-event',
        group: 'Scheduled Events'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['scheduled_events:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.calendly.com/api-docs/2d5ed9bbd2952-list-events
        const response = await nango.get({
            endpoint: `/scheduled_events/${input.uuid}`,
            retries: 3
        });

        if (!response.data || !response.data.resource) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Scheduled event not found',
                uuid: input.uuid
            });
        }

        const providerEvent = ProviderScheduledEventSchema.parse(response.data.resource);

        return {
            uri: providerEvent.uri,
            event_type: providerEvent.event_type,
            name: providerEvent.name,
            status: providerEvent.status,
            start_time: providerEvent.start_time,
            end_time: providerEvent.end_time,
            created_at: providerEvent.created_at,
            updated_at: providerEvent.updated_at,
            ...(providerEvent.event_memberships !== undefined && { event_memberships: providerEvent.event_memberships }),
            ...(providerEvent.event_guests !== undefined && { event_guests: providerEvent.event_guests }),
            ...(providerEvent.invitees_counter !== undefined && { invitees_counter: providerEvent.invitees_counter }),
            ...(providerEvent.location !== undefined && { location: providerEvent.location }),
            ...(providerEvent.calendar_event !== undefined && { calendar_event: providerEvent.calendar_event }),
            ...(providerEvent.meeting_notes_html !== undefined && { meeting_notes_html: providerEvent.meeting_notes_html }),
            ...(providerEvent.meeting_notes_plain !== undefined && { meeting_notes_plain: providerEvent.meeting_notes_plain })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
