import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required');

const ProviderCalendarSchema = z.object({
    id: z.string()
});

const OutputSchema = z
    .object({
        id: z
            .string()
            .describe(
                'The user\'s Google account ID. For Google Calendar this is the primary calendar ID, which matches the user\'s email address. Example: "user@example.com"'
            ),
        email: z.string().describe('The user\'s Google account email address. Example: "user@example.com"')
    })
    .describe("The current user's Google account ID and email");

/**
 * @tags: [read]
 * @tagReason: Reads the current user\'s primary calendar metadata from Google Calendar.
 * @pitfalls: The returned id and email are always identical because Google Calendar does not expose a separate numeric account identifier.
 */
const action = createAction({
    description: "Return the current user's Google account ID and email",
    version: '3.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.google.com/workspace/calendar/api/v3/reference/calendars/get
            endpoint: '/calendar/v3/calendars/primary',
            retries: 3
        });

        const calendar = ProviderCalendarSchema.parse(response.data);

        return {
            id: calendar.id,
            email: calendar.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
