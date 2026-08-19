import { createSync } from 'nango';
import { z } from 'zod';

const EventTypeSchema = z
    .object({
        id: z.string().describe('Unique identifier of the event type'),
        lengthInMinutes: z.number().describe('Duration of the event type in minutes'),
        lengthInMinutesOptions: z.array(z.number()).optional().describe('Optional selectable durations in minutes'),
        title: z.string().describe('Display title of the event type'),
        slug: z.string().describe('URL-friendly identifier for the event type'),
        description: z.string().optional().describe('Description shown on the booking page'),
        locations: z.array(z.unknown()).optional().describe('Configured meeting locations for this event type'),
        bookingFields: z.array(z.unknown()).optional().describe('Custom fields shown on the booking form'),
        disableGuests: z.boolean().describe('Whether guests are disallowed for this event type'),
        slotInterval: z.number().nullable().optional().describe('Interval between bookable slots in minutes'),
        minimumBookingNotice: z.number().describe('Minimum minutes before the event that a booking can be made'),
        beforeEventBuffer: z.number().describe('Minutes blocked on the calendar before the event'),
        afterEventBuffer: z.number().describe('Minutes blocked on the calendar after the event'),
        recurrence: z.unknown().nullable().optional().describe('Recurring event configuration if applicable'),
        metadata: z.unknown().optional().describe('Arbitrary metadata attached to the event type'),
        price: z.number().optional().describe('Price for booking this event type'),
        currency: z.string().optional().describe('Currency code for the price'),
        lockTimeZoneToggleOnBookingPage: z.boolean().describe('Whether the time-zone toggle is locked on the booking page'),
        seatsPerTimeSlot: z.number().nullable().optional().describe('Number of seats available per time slot'),
        forwardParamsSuccessRedirect: z.boolean().nullable().optional().describe('Whether to forward query parameters to the success redirect URL'),
        successRedirectUrl: z.string().nullable().optional().describe('URL to redirect to after a successful booking'),
        isInstantEvent: z.boolean().describe('Whether this is an instant event type'),
        scheduleId: z.number().nullable().optional().describe('ID of the schedule used for availability'),
        hidden: z.boolean().describe('Whether the event type is hidden from public booking pages'),
        bookingRequiresAuthentication: z.boolean().describe('Whether authentication is required to book this event type'),
        ownerId: z.number().describe('ID of the user who owns this event type'),
        users: z.array(z.unknown()).optional().describe('Users associated with this event type'),
        bookingUrl: z.string().describe('Public URL for booking this event type')
    })
    .describe('A bookable event type from Cal.com');

const ProviderEventTypeSchema = z.object({
    id: z.number(),
    lengthInMinutes: z.number(),
    lengthInMinutesOptions: z.array(z.number()).optional(),
    title: z.string(),
    slug: z.string(),
    description: z.string().optional().nullable(),
    locations: z.array(z.unknown()).optional().nullable(),
    bookingFields: z.array(z.unknown()).optional().nullable(),
    disableGuests: z.boolean().optional().nullable(),
    slotInterval: z.number().nullable().optional(),
    minimumBookingNotice: z.number().optional().nullable(),
    beforeEventBuffer: z.number().optional().nullable(),
    afterEventBuffer: z.number().optional().nullable(),
    recurrence: z.unknown().nullable().optional(),
    metadata: z.unknown().nullable().optional(),
    price: z.number().optional().nullable(),
    currency: z.string().optional().nullable(),
    lockTimeZoneToggleOnBookingPage: z.boolean().optional().nullable(),
    seatsPerTimeSlot: z.number().nullable().optional(),
    forwardParamsSuccessRedirect: z.boolean().nullable().optional(),
    successRedirectUrl: z.string().nullable().optional(),
    isInstantEvent: z.boolean().optional().nullable(),
    scheduleId: z.number().nullable().optional(),
    hidden: z.boolean().optional().nullable(),
    bookingRequiresAuthentication: z.boolean().optional().nullable(),
    ownerId: z.number().optional().nullable(),
    users: z.array(z.unknown()).optional().nullable(),
    bookingUrl: z.string().optional().nullable()
});

const ProviderResponseSchema = z.object({
    status: z.enum(['success', 'error']),
    data: z.array(ProviderEventTypeSchema)
});

const sync = createSync({
    description: 'Sync event types from Cal.com',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        EventType: EventTypeSchema
    },

    exec: async (nango) => {
        // GET /v2/event-types supports ordering by creation, but it does not expose
        // a filter boundary or cursor that would let the sync advance incrementally.
        await nango.trackDeletesStart('EventType');

        // https://cal.com/docs/api-reference/v2/event-types
        const response = await nango.get({
            endpoint: '/event-types',
            headers: {
                'cal-api-version': '2024-06-14'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse event types response: ${parsed.error.message}`);
        }

        if (parsed.data.status !== 'success') {
            throw new Error('Cal.com API returned a non-success status for event types.');
        }

        const eventTypes = parsed.data.data.map((item) => {
            if (item.id === undefined || item.id === null) {
                throw new Error('Event type missing required id field');
            }

            return {
                id: String(item.id),
                lengthInMinutes: item.lengthInMinutes,
                lengthInMinutesOptions: item.lengthInMinutesOptions ?? undefined,
                title: item.title,
                slug: item.slug,
                description: item.description ?? undefined,
                locations: item.locations ?? undefined,
                bookingFields: item.bookingFields ?? undefined,
                disableGuests: item.disableGuests ?? false,
                slotInterval: item.slotInterval ?? null,
                minimumBookingNotice: item.minimumBookingNotice ?? 0,
                beforeEventBuffer: item.beforeEventBuffer ?? 0,
                afterEventBuffer: item.afterEventBuffer ?? 0,
                recurrence: item.recurrence ?? null,
                metadata: item.metadata ?? undefined,
                price: item.price ?? undefined,
                currency: item.currency ?? undefined,
                lockTimeZoneToggleOnBookingPage: item.lockTimeZoneToggleOnBookingPage ?? false,
                seatsPerTimeSlot: item.seatsPerTimeSlot ?? null,
                forwardParamsSuccessRedirect: item.forwardParamsSuccessRedirect ?? null,
                successRedirectUrl: item.successRedirectUrl ?? null,
                isInstantEvent: item.isInstantEvent ?? false,
                scheduleId: item.scheduleId ?? null,
                hidden: item.hidden ?? false,
                bookingRequiresAuthentication: item.bookingRequiresAuthentication ?? false,
                ownerId: item.ownerId ?? 0,
                users: item.users ?? undefined,
                bookingUrl: item.bookingUrl ?? ''
            };
        });

        await nango.batchSave(eventTypes, 'EventType');
        await nango.trackDeletesEnd('EventType');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
