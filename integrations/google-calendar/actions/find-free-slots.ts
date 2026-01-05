/**
 * Instructions: Finds available time slots across calendars within a time range
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/freebusy/query
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const FindFreeSlotsInput = z.object({
    timeMin: z.string(),
    timeMax: z.string(),
    calendar_ids: z.array(z.string()),
    duration_minutes: z.number(),
    timeZone: z.string().optional()
});

const FindFreeSlotsOutput = z.object({
    free_slots: z.array(z.any())
});

const action = createAction({
    description: 'Finds available time slots across calendars within a time range',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/freebusy/query
    endpoint: {
        method: 'POST',
        path: '/freeBusy/findSlots',
        group: 'Scheduling'
    },
    input: FindFreeSlotsInput,
    output: FindFreeSlotsOutput,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    exec: async (nango, input): Promise<z.infer<typeof FindFreeSlotsOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/freebusy/query
            endpoint: '/calendar/v3/freeBusy',
            data: {
                timeMin: input.timeMin,
                timeMax: input.timeMax,
                items: input.calendar_ids.map((id) => ({ id })),
                ...(input.timeZone && { timeZone: input.timeZone })
            },
            retries: 3
        };

        const response = await nango.post(config);

        // Process the free/busy response to find available slots
        const busyPeriods: { start: Date; end: Date }[] = [];

        if (response.data.calendars) {
            for (const calendarId of Object.keys(response.data.calendars)) {
                const calendar = response.data.calendars[calendarId];
                if (calendar.busy) {
                    for (const busy of calendar.busy) {
                        busyPeriods.push({
                            start: new Date(busy.start),
                            end: new Date(busy.end)
                        });
                    }
                }
            }
        }

        // Sort busy periods by start time
        busyPeriods.sort((a, b) => a.start.getTime() - b.start.getTime());

        // Find free slots
        const freeSlots: { start: string; end: string }[] = [];
        const durationMs = input.duration_minutes * 60 * 1000;
        let currentStart = new Date(input.timeMin);
        const endTime = new Date(input.timeMax);

        for (const busy of busyPeriods) {
            // If there's a gap before this busy period
            if (currentStart < busy.start) {
                const gapDuration = busy.start.getTime() - currentStart.getTime();
                if (gapDuration >= durationMs) {
                    freeSlots.push({
                        start: currentStart.toISOString(),
                        end: busy.start.toISOString()
                    });
                }
            }
            // Move current start to after this busy period
            if (busy.end > currentStart) {
                currentStart = busy.end;
            }
        }

        // Check for free time after all busy periods
        if (currentStart < endTime) {
            const gapDuration = endTime.getTime() - currentStart.getTime();
            if (gapDuration >= durationMs) {
                freeSlots.push({
                    start: currentStart.toISOString(),
                    end: endTime.toISOString()
                });
            }
        }

        return {
            free_slots: freeSlots
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
