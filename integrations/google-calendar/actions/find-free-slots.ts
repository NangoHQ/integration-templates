import { z } from 'zod';
import { createAction } from 'nango';

const CalendarItemSchema = z
    .object({
        id: z.string().describe('Calendar or group identifier to query. Example: "primary" or "user@example.com"')
    })
    .describe('A calendar or group to include in the free/busy query.');

const InputSchema = z
    .object({
        timeMin: z.string().describe('Start of the query interval as an RFC3339 timestamp. Example: "2024-01-15T09:00:00Z"'),
        timeMax: z.string().describe('End of the query interval as an RFC3339 timestamp. Example: "2024-01-15T17:00:00Z"'),
        timeZone: z.string().optional().describe('Time zone used in the response. Defaults to UTC if omitted. Example: "America/New_York"'),
        items: z.array(CalendarItemSchema).describe('Calendars and/or groups to query for free/busy information.'),
        minimumDurationMinutes: z.number().int().min(1).describe('Minimum duration in minutes for a returned free slot.')
    })
    .describe('Input for finding free time slots across calendars.');

const FreeSlotSchema = z
    .object({
        start: z.string().describe('RFC3339 start of the free slot.'),
        end: z.string().describe('RFC3339 end of the free slot.')
    })
    .describe('A contiguous time gap where all queried calendars are free.');

const OutputSchema = z
    .object({
        freeSlots: z.array(FreeSlotSchema).describe('Time gaps during which all queried calendars are free and that meet the minimum duration.')
    })
    .describe('Output containing free time slots that satisfy the minimum duration.');

const BusyIntervalSchema = z.object({
    start: z.string(),
    end: z.string()
});

const CalendarErrorSchema = z.object({
    domain: z.string(),
    reason: z.string()
});

const CalendarFreeBusySchema = z.object({
    busy: z.array(BusyIntervalSchema).default([]),
    errors: z.array(CalendarErrorSchema).optional()
});

const FreeBusyResponseSchema = z.object({
    timeMin: z.string(),
    timeMax: z.string(),
    calendars: z.record(z.string(), CalendarFreeBusySchema).optional()
});

/**
 * @tags: [read]
 * @tagReason: Reads free/busy data from the provider without mutating calendars or events.
 * @pitfalls: Provider limits requests to 50 expanded calendars; inaccessible calendars return errors that cause the action to throw instead of partial results.
 */
const action = createAction({
    description: 'Query free/busy data and return gaps meeting a minimum duration.',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestItems = input.items.map((item) => ({ id: item.id }));

        // https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query
        const response = await nango.post({
            endpoint: '/calendar/v3/freeBusy',
            data: {
                timeMin: input.timeMin,
                timeMax: input.timeMax,
                items: requestItems,
                ...(input.timeZone !== undefined && { timeZone: input.timeZone })
            },
            retries: 3
        });

        const freeBusy = FreeBusyResponseSchema.parse(response.data);
        const calendars = freeBusy.calendars ?? {};
        const allBusy: Array<{ start: string; end: string }> = [];

        for (const [calendarId, calendarData] of Object.entries(calendars)) {
            if (calendarData.errors && calendarData.errors.length > 0) {
                const reasons = calendarData.errors.map((error) => error.reason);
                throw new nango.ActionError({
                    type: 'calendar_error',
                    message: `Calendar "${calendarId}" returned errors: ${reasons.join(', ')}`
                });
            }

            for (const interval of calendarData.busy) {
                allBusy.push({ start: interval.start, end: interval.end });
            }
        }

        if (allBusy.length === 0) {
            const durationMs = new Date(input.timeMax).getTime() - new Date(input.timeMin).getTime();
            const durationMinutes = Math.floor(durationMs / 60000);

            if (durationMinutes >= input.minimumDurationMinutes) {
                return {
                    freeSlots: [{ start: input.timeMin, end: input.timeMax }]
                };
            }

            return { freeSlots: [] };
        }

        allBusy.sort((a, b) => {
            const aStart = new Date(a.start).getTime();
            const bStart = new Date(b.start).getTime();
            return aStart - bStart;
        });

        const merged: Array<{ start: string; end: string }> = [];
        for (const interval of allBusy) {
            if (merged.length === 0) {
                merged.push({ start: interval.start, end: interval.end });
                continue;
            }

            const last = merged[merged.length - 1];
            if (!last) {
                merged.push({ start: interval.start, end: interval.end });
                continue;
            }

            const lastEnd = new Date(last.end).getTime();
            const currentStart = new Date(interval.start).getTime();
            const currentEnd = new Date(interval.end).getTime();

            if (currentStart <= lastEnd) {
                if (currentEnd > lastEnd) {
                    last.end = interval.end;
                }
            } else {
                merged.push({ start: interval.start, end: interval.end });
            }
        }

        const freeSlots: Array<{ start: string; end: string }> = [];
        const minDurationMs = input.minimumDurationMinutes * 60000;
        const rangeStart = new Date(input.timeMin).getTime();
        const rangeEnd = new Date(input.timeMax).getTime();

        const firstMerged = merged[0];
        if (firstMerged) {
            const firstBusyStart = new Date(firstMerged.start).getTime();
            if (firstBusyStart > rangeStart) {
                const gapMs = firstBusyStart - rangeStart;
                if (gapMs >= minDurationMs) {
                    freeSlots.push({ start: input.timeMin, end: firstMerged.start });
                }
            }
        }

        for (let i = 0; i < merged.length - 1; i++) {
            const current = merged[i];
            const next = merged[i + 1];
            if (!current || !next) {
                continue;
            }

            const currentEnd = new Date(current.end).getTime();
            const nextStart = new Date(next.start).getTime();
            if (nextStart > currentEnd) {
                const gapMs = nextStart - currentEnd;
                if (gapMs >= minDurationMs) {
                    freeSlots.push({ start: current.end, end: next.start });
                }
            }
        }

        const lastMerged = merged[merged.length - 1];
        if (lastMerged) {
            const lastBusyEnd = new Date(lastMerged.end).getTime();
            if (rangeEnd > lastBusyEnd) {
                const gapMs = rangeEnd - lastBusyEnd;
                if (gapMs >= minDurationMs) {
                    freeSlots.push({ start: lastMerged.end, end: input.timeMax });
                }
            }
        }

        return { freeSlots };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
