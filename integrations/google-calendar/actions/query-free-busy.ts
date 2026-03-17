import { z } from 'zod';
import { createAction } from 'nango';

const CalendarItemSchema = z.object({
    id: z.string().describe('The identifier of a calendar or a group')
});

const InputSchema = z.object({
    timeMin: z.string().describe('The start of the interval for the query formatted as per RFC3339. Example: "2024-01-01T00:00:00Z"'),
    timeMax: z.string().describe('The end of the interval for the query formatted as per RFC3339. Example: "2024-01-02T00:00:00Z"'),
    timeZone: z.string().optional().describe('Time zone used in the response. The default is UTC. Example: "UTC"'),
    groupExpansionMax: z.number().optional().describe('Maximal number of calendar identifiers to be provided for a single group. Maximum value is 100.'),
    calendarExpansionMax: z.number().optional().describe('Maximal number of calendars for which FreeBusy information is to be provided. Maximum value is 50.'),
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
    timeMin: z.string(),
    timeMax: z.string(),
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
            timeMin: input.timeMin,
            timeMax: input.timeMax,
            items: input.items
        };

        if (input.timeZone) {
            requestBody.timeZone = input.timeZone;
        }
        if (input.groupExpansionMax !== undefined) {
            requestBody.groupExpansionMax = input.groupExpansionMax;
        }
        if (input.calendarExpansionMax !== undefined) {
            requestBody.calendarExpansionMax = input.calendarExpansionMax;
        }

        const response = await nango.post({
            // https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query
            endpoint: '/calendar/v3/freeBusy',
            data: requestBody,
            retries: 3
        });

        return {
            kind: response.data.kind,
            timeMin: response.data.timeMin,
            timeMax: response.data.timeMax,
            groups: response.data.groups,
            calendars: response.data.calendars
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
