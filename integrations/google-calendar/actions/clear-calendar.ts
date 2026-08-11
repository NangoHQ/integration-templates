import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required. Clears all events from the primary calendar.');

const OutputSchema = z.object({}).describe('Empty success response indicating the calendar was cleared.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes all events from the primary calendar via the provider clear endpoint.
 * @pitfalls: Only works on the primary calendar and permanently deletes all events with no recovery.
 */
const action = createAction({
    description: 'Clear the primary calendar by deleting all events.',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/calendar/api/v3/reference/calendars/clear
        await nango.post({
            endpoint: '/calendar/v3/calendars/primary/clear',
            retries: 1
        });

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
