import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().describe('The unique identifier of the calendar to update. Example: "AQMkAGI..."'),
    name: z.string().optional().describe('The calendar name. Example: "Work Calendar"'),
    color: z.string().optional().describe('The color of the calendar in hex format or a preset color constant. Example: "#2B579A" or "lightBlue"')
});

const ProviderCalendarSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    color: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    color: z.string().optional()
});

const action = createAction({
    description: 'Update calendar properties.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-calendar',
        group: 'Calendars'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Calendars.ReadWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateData: Record<string, unknown> = {};
        if (input.name !== undefined) {
            updateData['name'] = input.name;
        }
        if (input.color !== undefined) {
            updateData['color'] = input.color;
        }

        const response = await nango.patch({
            // https://learn.microsoft.com/graph/api/calendar-update
            endpoint: `/v1.0/me/calendars/${encodeURIComponent(input.calendarId)}`,
            data: updateData,
            retries: 3
        });

        const providerCalendar = ProviderCalendarSchema.parse(response.data);

        return {
            id: providerCalendar.id,
            ...(providerCalendar.name !== undefined && { name: providerCalendar.name }),
            ...(providerCalendar.color !== undefined && { color: providerCalendar.color })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
