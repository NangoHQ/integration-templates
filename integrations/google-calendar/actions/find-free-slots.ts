import { z } from 'zod';
import { createAction } from 'nango';

const TimeMinSchema = z.string().describe('Start of the time range in RFC3339 format. Example: "2024-03-15T09:00:00Z"');
const TimeMaxSchema = z.string().describe('End of the time range in RFC3339 format. Example: "2024-03-15T17:00:00Z"');

const InputSchema = z.object({
    calendar_ids: z.array(z.string()).describe('List of calendar IDs to check for free/busy information. Example: ["primary", "work@example.com"]'),
    time_min: TimeMinSchema,
    time_max: TimeMaxSchema,
    duration_minutes: z.number().min(1).describe('Minimum duration in minutes for a free slot to be returned. Example: 30')
});

const FreeSlotSchema = z.object({
    start: z.string().describe('Start time of the free slot in RFC3339 format'),
    end: z.string().describe('End time of the free slot in RFC3339 format'),
    duration_minutes: z.number().describe('Duration of the free slot in minutes')
});

const OutputSchema = z.object({
    free_slots: z.array(FreeSlotSchema).describe('List of free time slots meeting the minimum duration'),
    calendars_checked: z.number().describe('Number of calendars checked')
});

const action = createAction({
    description: 'Query free/busy data and return gaps meeting a minimum duration',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/find-free-slots',
        group: 'Calendar'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.freebusy'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/calendar/api/v3/reference/freebusy/query
        const response = await nango.post({
            endpoint: '/calendar/v3/freeBusy',
            data: {
                timeMin: input.time_min,
                timeMax: input.time_max,
                items: input.calendar_ids.map((id) => ({ id })),
                timeZone: 'UTC'
            },
            retries: 3
        });

        if (!response.data || !response.data.calendars) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to retrieve free/busy data from Google Calendar'
            });
        }

        const calendars = response.data.calendars;
        const calendarCount = Object.keys(calendars).length;

        // Collect all busy periods from all calendars
        const allBusyPeriods: Array<{ start: string; end: string }> = [];

        for (const calendarId of input.calendar_ids) {
            const calendarData = calendars[calendarId];

            if (!calendarData || calendarData.errors) {
                continue;
            }

            const busyPeriods = calendarData.busy || [];
            for (const period of busyPeriods) {
                allBusyPeriods.push({
                    start: period.start,
                    end: period.end
                });
            }
        }

        // Sort busy periods by start time
        allBusyPeriods.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        // Merge overlapping busy periods
        const mergedBusyPeriods: Array<{ start: string; end: string }> = [];

        for (const period of allBusyPeriods) {
            if (mergedBusyPeriods.length === 0) {
                mergedBusyPeriods.push(period);
                continue;
            }

            const lastPeriod = mergedBusyPeriods[mergedBusyPeriods.length - 1];
            if (!lastPeriod) {
                mergedBusyPeriods.push(period);
                continue;
            }

            const lastEnd = new Date(lastPeriod.end).getTime();
            const currentStart = new Date(period.start).getTime();

            if (currentStart <= lastEnd) {
                // Overlapping or contiguous - merge them
                const currentEnd = new Date(period.end).getTime();
                if (currentEnd > lastEnd) {
                    lastPeriod.end = period.end;
                }
            } else {
                // No overlap - add new period
                mergedBusyPeriods.push(period);
            }
        }

        // Find free slots (gaps between busy periods)
        const freeSlots: Array<{ start: string; end: string; duration_minutes: number }> = [];
        const rangeStart = new Date(input.time_min).getTime();
        const rangeEnd = new Date(input.time_max).getTime();
        const minDurationMs = input.duration_minutes * 60 * 1000;

        if (mergedBusyPeriods.length === 0) {
            // No busy periods at all - entire range is free
            const totalDuration = rangeEnd - rangeStart;
            if (totalDuration >= minDurationMs) {
                freeSlots.push({
                    start: input.time_min,
                    end: input.time_max,
                    duration_minutes: Math.floor(totalDuration / (60 * 1000))
                });
            }
        } else {
            // Check for free time before first busy period
            const firstBusyPeriod = mergedBusyPeriods[0];
            if (firstBusyPeriod) {
                const firstBusyStart = new Date(firstBusyPeriod.start).getTime();
                if (firstBusyStart > rangeStart) {
                    const gapDuration = firstBusyStart - rangeStart;
                    if (gapDuration >= minDurationMs) {
                        freeSlots.push({
                            start: input.time_min,
                            end: firstBusyPeriod.start,
                            duration_minutes: Math.floor(gapDuration / (60 * 1000))
                        });
                    }
                }
            }

            // Check gaps between busy periods
            for (let i = 0; i < mergedBusyPeriods.length - 1; i++) {
                const currentPeriod = mergedBusyPeriods[i];
                const nextPeriod = mergedBusyPeriods[i + 1];

                if (!currentPeriod || !nextPeriod) {
                    continue;
                }

                const currentEnd = new Date(currentPeriod.end).getTime();
                const nextStart = new Date(nextPeriod.start).getTime();

                if (nextStart > currentEnd) {
                    const gapDuration = nextStart - currentEnd;
                    if (gapDuration >= minDurationMs) {
                        freeSlots.push({
                            start: currentPeriod.end,
                            end: nextPeriod.start,
                            duration_minutes: Math.floor(gapDuration / (60 * 1000))
                        });
                    }
                }
            }

            // Check for free time after last busy period
            const lastBusyPeriod = mergedBusyPeriods[mergedBusyPeriods.length - 1];
            if (lastBusyPeriod) {
                const lastBusyEnd = new Date(lastBusyPeriod.end).getTime();
                if (lastBusyEnd < rangeEnd) {
                    const gapDuration = rangeEnd - lastBusyEnd;
                    if (gapDuration >= minDurationMs) {
                        freeSlots.push({
                            start: lastBusyPeriod.end,
                            end: input.time_max,
                            duration_minutes: Math.floor(gapDuration / (60 * 1000))
                        });
                    }
                }
            }
        }

        return {
            free_slots: freeSlots,
            calendars_checked: calendarCount
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
