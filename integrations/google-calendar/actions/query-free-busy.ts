import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        timeMin: z.string().describe('The start of the interval for the query in RFC3339 format. Example: "2024-01-01T00:00:00Z"'),
        timeMax: z.string().describe('The end of the interval for the query in RFC3339 format. Example: "2024-01-02T00:00:00Z"'),
        timeZone: z.string().optional().describe('Time zone used in the response. Defaults to UTC if omitted.'),
        groupExpansionMax: z
            .number()
            .int()
            .optional()
            .describe('Maximal number of calendar identifiers to be provided for a single group. Maximum value is 100.'),
        calendarExpansionMax: z
            .number()
            .int()
            .optional()
            .describe('Maximal number of calendars for which FreeBusy information is to be provided. Maximum value is 50.'),
        calendarIds: z.array(z.string()).describe('List of calendar identifiers to query.')
    })
    .describe('Input for querying free/busy information for one or more calendars.');

const BusyBlockSchema = z
    .object({
        start: z.string().describe('The inclusive start of the busy period in RFC3339 format.'),
        end: z.string().describe('The exclusive end of the busy period in RFC3339 format.')
    })
    .describe('A single busy time block for a calendar.');

const CalendarErrorSchema = z
    .object({
        domain: z.string().describe('Error domain.'),
        reason: z.string().describe('Error reason.')
    })
    .describe('An error entry returned for a specific calendar or group.');

const CalendarFreeBusySchema = z
    .object({
        calendarId: z.string().describe('Calendar identifier.'),
        busy: z.array(BusyBlockSchema).describe('List of busy time ranges for this calendar.'),
        errors: z.array(CalendarErrorSchema).optional().describe('Optional errors if computation for this calendar failed.')
    })
    .describe('Free/busy information for a single calendar.');

const OutputSchema = z
    .object({
        timeMin: z.string().describe('The start of the queried interval in RFC3339 format.'),
        timeMax: z.string().describe('The end of the queried interval in RFC3339 format.'),
        calendars: z.array(CalendarFreeBusySchema).describe('Free/busy information for each requested calendar.')
    })
    .describe('Output containing free/busy blocks for the requested calendars.');

const ProviderErrorSchema = z.object({
    domain: z.string(),
    reason: z.string()
});

const ProviderCalendarSchema = z.object({
    errors: z.array(ProviderErrorSchema).optional(),
    busy: z
        .array(
            z.object({
                start: z.string(),
                end: z.string()
            })
        )
        .optional()
});

const ProviderResponseSchema = z.object({
    kind: z.string().optional(),
    timeMin: z.string(),
    timeMax: z.string(),
    groups: z
        .record(
            z.string(),
            z.object({
                errors: z.array(ProviderErrorSchema).optional(),
                calendars: z.array(z.string()).optional()
            })
        )
        .optional(),
    calendars: z.record(z.string(), ProviderCalendarSchema).optional()
});

/**
 * @tags: [read]
 * @tagReason: Reads free/busy availability blocks from the Google Calendar API.
 * @pitfalls: The API rejects overly long time ranges and may return per-calendar errors under errors instead of busy blocks while still returning a 200 response.
 */
const action = createAction({
    description: 'Return free/busy blocks for one or more calendars in a time range',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query
            endpoint: '/calendar/v3/freeBusy',
            data: {
                timeMin: input.timeMin,
                timeMax: input.timeMax,
                ...(input.timeZone !== undefined && { timeZone: input.timeZone }),
                ...(input.groupExpansionMax !== undefined && { groupExpansionMax: input.groupExpansionMax }),
                ...(input.calendarExpansionMax !== undefined && { calendarExpansionMax: input.calendarExpansionMax }),
                items: input.calendarIds.map((id) => ({ id }))
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const calendars: z.infer<typeof CalendarFreeBusySchema>[] = [];
        if (providerResponse.calendars) {
            for (const [calendarId, cal] of Object.entries(providerResponse.calendars)) {
                const busy = (cal.busy || []).map((block) => ({
                    start: block.start,
                    end: block.end
                }));
                const errors = cal.errors;
                calendars.push({
                    calendarId,
                    busy,
                    ...(errors !== undefined && errors.length > 0 && { errors })
                });
            }
        }

        return {
            timeMin: providerResponse.timeMin,
            timeMax: providerResponse.timeMax,
            calendars
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
