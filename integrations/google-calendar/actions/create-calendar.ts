import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    summary: z.string().describe('Title of the calendar. Example: "My Work Calendar"')
});

const OutputSchema = z.object({
    id: z.string().describe('Identifier of the calendar.'),
    summary: z.string().describe('Title of the calendar.'),
    description: z.union([z.string(), z.null()]).describe('Description of the calendar.'),
    timeZone: z.union([z.string(), z.null()]).describe('The time zone of the calendar.'),
    location: z.union([z.string(), z.null()]).describe('Geographic location of the calendar as free-form text.'),
    etag: z.string().describe('ETag of the resource.'),
    kind: z.string().describe('Type of the resource ("calendar#calendar").')
});

const action = createAction({
    description: 'Create a new secondary Google Calendar with the specified title.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/create-calendar',
        group: 'Calendars'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/calendars/insert
        const response = await nango.post({
            endpoint: '/calendar/v3/calendars',
            data: {
                summary: input.summary
            },
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'Failed to create calendar',
                summary: input.summary
            });
        }

        return {
            id: response.data.id,
            summary: response.data.summary,
            description: response.data.description ?? null,
            timeZone: response.data.timeZone ?? null,
            location: response.data.location ?? null,
            etag: response.data.etag,
            kind: response.data.kind
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
