import { z } from 'zod';
import { createAction } from 'nango';

const CalendarItemSchema = z.object({
    id: z.string().describe('The identifier of a calendar or a group')
});

const InputSchema = z.object({
    time_min: z.string().describe('The start of the interval for the query formatted as per RFC3339. Example: "2024-01-01T00:00:00Z"'),
    time_max: z.string().describe('The end of the interval for the query formatted as per RFC3339. Example: "2024-01-02T00:00:00Z"'),
    time_zone: z.string().optional().describe('Time zone used in the response. The default is UTC. Example: "UTC"'),
    group_expansion_max: z.number().optional().describe('Maximal number of calendar identifiers to be provided for a single group. Maximum value is 100.'),
    calendar_expansion_max: z
        .number()
        .optional()
        .describe('Maximal number of calendars for which FreeBusy information is to be provided. Maximum value is 50.'),
    items: z.array(CalendarItemSchema).describe('List of calendars and/or groups to query')
});

const ErrorSchema = z.object({
    domain: z.string(),
    reason: z.string()
});

const BusyPeriodSchema = z.object({
    start: z.string(),
    end: z.string()
});

const CalendarFreeBusySchema = z.object({
    errors: z.array(ErrorSchema).optional(),
    busy: z.array(BusyPeriodSchema)
});

const GroupSchema = z.object({
    errors: z.array(ErrorSchema).optional(),
    calendars: z.array(z.string())
});

const OutputSchema = z.object({
    kind: z.string(),
    time_min: z.string(),
    time_max: z.string(),
    groups: z.record(z.string(), GroupSchema).optional(),
    calendars: z.record(z.string(), CalendarFreeBusySchema)
});

const action = createAction({
    description: 'Return free/busy blocks for one or more calendars in a time range',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/query-free-busy',
        group: 'Calendars'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: {
            timeMin: string;
            timeMax: string;
            timeZone?: string;
            groupExpansionMax?: number;
            calendarExpansionMax?: number;
            items: { id: string }[];
        } = {
            timeMin: input.time_min,
            timeMax: input.time_max,
            items: input.items
        };

        if (input.time_zone) {
            requestBody.timeZone = input.time_zone;
        }
        if (input.group_expansion_max !== undefined) {
            requestBody.groupExpansionMax = input.group_expansion_max;
        }
        if (input.calendar_expansion_max !== undefined) {
            requestBody.calendarExpansionMax = input.calendar_expansion_max;
        }

        const response = await nango.post({
            // https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query
            endpoint: '/calendar/v3/freeBusy',
            data: requestBody,
            retries: 3
        });

        return {
            kind: response.data.kind,
            time_min: response.data.timeMin,
            time_max: response.data.timeMax,
            groups: response.data.groups,
            calendars: response.data.calendars
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
