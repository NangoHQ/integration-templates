import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        start: z
            .string()
            .describe(
                'Time starting from which available slots should be checked, in UTC as an ISO 8601 datestring. Example: "2033-09-05" or "2033-09-05T09:00:00Z".'
            ),
        end: z
            .string()
            .describe('Time until which available slots should be checked, in UTC as an ISO 8601 datestring. Example: "2033-09-06" or "2033-09-06T18:00:00Z".'),
        eventTypeId: z.number().optional().describe('The ID of the event type for which available slots should be checked.'),
        eventTypeSlug: z
            .string()
            .optional()
            .describe('The slug of the event type. If provided, username or teamSlug must be provided too (and organizationSlug if relevant).'),
        username: z.string().optional().describe('The username of the event owner. Used together with eventTypeSlug for an individual event type.'),
        teamSlug: z.string().optional().describe('The slug of the team that owns the event type. Used together with eventTypeSlug for a team event type.'),
        organizationSlug: z.string().optional().describe('The slug of the organization to which the user (username) or team (teamSlug) belongs.'),
        usernames: z
            .string()
            .optional()
            .describe(
                'Comma-separated usernames to check combined availability for a dynamic event (no specific event type). Must contain at least 2 usernames.'
            ),
        timeZone: z.string().optional().describe('Time zone in which the available slots should be returned. Defaults to UTC.'),
        duration: z
            .number()
            .optional()
            .describe('Desired slot length in minutes. Only used for event types that allow multiple durations, or for dynamic events (defaults to 30).'),
        format: z
            .enum(['time', 'range'])
            .optional()
            .describe('Use "range" to get the start and end of each slot. Use "time" (default) to get only the slot start.'),
        bookingUidToReschedule: z
            .string()
            .optional()
            .describe('The unique identifier of the booking being rescheduled, so its original time is included among the returned available slots.')
    })
    .describe('Input for getting available slots from Cal.com.');

const SlotSchema = z
    .object({
        start: z.string().describe('Slot start time in ISO 8601 format.'),
        end: z.string().optional().describe('Slot end time in ISO 8601 format. Present when format is "range".'),
        attendeesCount: z.number().optional().describe('Number of attendees already booked into this slot. Present for seated event types.'),
        bookingUid: z.string().optional().describe('UID of the seated booking this slot belongs to. Present for seated event types.')
    })
    .describe('An available time slot.');

const OutputSchema = z
    .object({
        status: z.enum(['success', 'error']).describe('Response status.'),
        data: z.record(z.string(), z.array(SlotSchema)).describe('Available slots keyed by date (YYYY-MM-DD). Empty object when no slots are available.')
    })
    .describe('Output for getting available slots from Cal.com.');

const RawSlotSchema = z.union([
    z.string(),
    z.object({
        start: z.string(),
        end: z.string().optional(),
        attendeesCount: z.number().optional(),
        bookingUid: z.string().optional()
    })
]);

const ProviderResponseSchema = z.object({
    status: z.enum(['success', 'error']),
    data: z.record(z.string(), z.array(RawSlotSchema)).optional()
});

/**
 * @tags: [read]
 * @tagReason: Reads available time slots for an event type from Cal.com without mutating provider data.
 * @pitfalls: Despite the OpenAPI schema declaring default-format slots as plain strings, Cal.com's v2 /slots endpoint returns an object with a "start" property per slot even when format is omitted or set to "time" - this action normalizes both shapes to the same SlotSchema. The cal-api-version header must be exactly 2024-09-04, otherwise Cal.com silently serves an older version of this endpoint.
 */
const action = createAction({
    description: 'Get available time slots for an event type from Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['EVENT_TYPE_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            start: input.start,
            end: input.end,
            ...(input.eventTypeId !== undefined && { eventTypeId: input.eventTypeId }),
            ...(input.eventTypeSlug !== undefined && { eventTypeSlug: input.eventTypeSlug }),
            ...(input.username !== undefined && { username: input.username }),
            ...(input.teamSlug !== undefined && { teamSlug: input.teamSlug }),
            ...(input.organizationSlug !== undefined && { organizationSlug: input.organizationSlug }),
            ...(input.usernames !== undefined && { usernames: input.usernames }),
            ...(input.timeZone !== undefined && { timeZone: input.timeZone }),
            ...(input.duration !== undefined && { duration: input.duration }),
            ...(input.format !== undefined && { format: input.format }),
            ...(input.bookingUidToReschedule !== undefined && { bookingUidToReschedule: input.bookingUidToReschedule })
        };

        let response;
        // @allowTryCatch: The Nango SDK throws for non-2xx responses. Convert Cal.com's error
        // envelope into a structured ActionError instead of letting the raw error propagate.
        try {
            response = await nango.get({
                // https://cal.com/docs/api-reference/v2/slots/get-available-slots-for-an-event-type
                endpoint: '/slots',
                params,
                headers: {
                    'cal-api-version': '2024-09-04'
                },
                retries: 3
            });
        } catch (err: unknown) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com API returned an error status.',
                details: err instanceof Error ? err.message : String(err)
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.status !== 'success') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com API returned an error status.'
            });
        }

        const data: Record<string, z.infer<typeof SlotSchema>[]> = {};
        for (const [date, slots] of Object.entries(providerResponse.data ?? {})) {
            data[date] = slots.map((slot) => (typeof slot === 'string' ? { start: slot } : slot));
        }

        return {
            status: providerResponse.status,
            data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
