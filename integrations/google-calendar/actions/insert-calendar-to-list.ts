import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendar_id: z.string().describe('The ID of the calendar to add to the list. Example: "primary" or a calendar email address'),
    color_rgb_format: z
        .boolean()
        .optional()
        .describe('Whether to use the foregroundColor and backgroundColor fields to write calendar colors (RGB). Optional. Default is false.'),
    background_color: z.string().optional().describe('The main color of the calendar in hexadecimal format "#0088aa". Requires colorRgbFormat=true. Optional.'),
    foreground_color: z
        .string()
        .optional()
        .describe('The foreground color of the calendar in hexadecimal format "#ffffff". Requires colorRgbFormat=true. Optional.'),
    color_id: z.string().optional().describe('The color ID from the calendar colors definition. Optional.'),
    hidden: z.boolean().optional().describe('Whether the calendar has been hidden from the list. Optional.'),
    selected: z.boolean().optional().describe('Whether the calendar content shows up in the calendar UI. Optional. Default is false.'),
    summary_override: z.string().optional().describe('The summary that the authenticated user has set for this calendar. Optional.')
});

const OutputSchema = z.object({
    id: z.string(),
    summary: z.string().optional(),
    summary_override: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    time_zone: z.string().optional(),
    access_role: z.string().optional(),
    background_color: z.string().optional(),
    foreground_color: z.string().optional(),
    color_id: z.string().optional(),
    hidden: z.boolean().optional(),
    selected: z.boolean().optional(),
    primary: z.boolean().optional()
});

const action = createAction({
    description: "Add an existing calendar to the user's calendar list with optional colors",
    version: '1.0.0',

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
                ...(input.color_rgb_format !== undefined && { colorRgbFormat: input.color_rgb_format.toString() })
            },
            data: {
                id: input.calendar_id,
                ...(input.background_color && { backgroundColor: input.background_color }),
                ...(input.foreground_color && { foregroundColor: input.foreground_color }),
                ...(input.color_id && { colorId: input.color_id }),
                ...(input.hidden !== undefined && { hidden: input.hidden }),
                ...(input.selected !== undefined && { selected: input.selected }),
                ...(input.summary_override && { summaryOverride: input.summary_override })
            },
            retries: 1
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
            summary_override: response.data.summaryOverride,
            description: response.data.description,
            location: response.data.location,
            time_zone: response.data.timeZone,
            access_role: response.data.accessRole,
            background_color: response.data.backgroundColor,
            foreground_color: response.data.foregroundColor,
            color_id: response.data.colorId,
            hidden: response.data.hidden,
            selected: response.data.selected,
            primary: response.data.primary
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
