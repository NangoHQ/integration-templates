import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().describe('The ID of the calendar to add to the list. Example: "primary" or a calendar email address'),
    colorRgbFormat: z
        .boolean()
        .optional()
        .describe('Whether to use the foregroundColor and backgroundColor fields to write calendar colors (RGB). Optional. Default is false.'),
    backgroundColor: z.string().optional().describe('The main color of the calendar in hexadecimal format "#0088aa". Requires colorRgbFormat=true. Optional.'),
    foregroundColor: z
        .string()
        .optional()
        .describe('The foreground color of the calendar in hexadecimal format "#ffffff". Requires colorRgbFormat=true. Optional.'),
    colorId: z.string().optional().describe('The color ID from the calendar colors definition. Optional.'),
    hidden: z.boolean().optional().describe('Whether the calendar has been hidden from the list. Optional.'),
    selected: z.boolean().optional().describe('Whether the calendar content shows up in the calendar UI. Optional. Default is false.'),
    summaryOverride: z.string().optional().describe('The summary that the authenticated user has set for this calendar. Optional.')
});

const OutputSchema = z.object({
    id: z.string(),
    summary: z.string().optional(),
    summaryOverride: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    timeZone: z.string().optional(),
    accessRole: z.string().optional(),
    backgroundColor: z.string().optional(),
    foregroundColor: z.string().optional(),
    colorId: z.string().optional(),
    hidden: z.boolean().optional(),
    selected: z.boolean().optional(),
    primary: z.boolean().optional()
});

const action = createAction({
    description: "Add an existing calendar to the user's calendar list with optional colors",
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/insert-calendar-to-list',
        group: 'Calendar List'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/insert
        const response = await nango.post({
            endpoint: '/calendar/v3/users/me/calendarList',
            params: {
                ...(input.colorRgbFormat !== undefined && { colorRgbFormat: input.colorRgbFormat.toString() })
            },
            data: {
                id: input.calendarId,
                ...(input.backgroundColor && { backgroundColor: input.backgroundColor }),
                ...(input.foregroundColor && { foregroundColor: input.foregroundColor }),
                ...(input.colorId && { colorId: input.colorId }),
                ...(input.hidden !== undefined && { hidden: input.hidden }),
                ...(input.selected !== undefined && { selected: input.selected }),
                ...(input.summaryOverride && { summaryOverride: input.summaryOverride })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to insert calendar into list'
            });
        }

        return {
            id: response.data.id,
            summary: response.data.summary,
            summaryOverride: response.data.summaryOverride,
            description: response.data.description,
            location: response.data.location,
            timeZone: response.data.timeZone,
            accessRole: response.data.accessRole,
            backgroundColor: response.data.backgroundColor,
            foregroundColor: response.data.foregroundColor,
            colorId: response.data.colorId,
            hidden: response.data.hidden,
            selected: response.data.selected,
            primary: response.data.primary
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
