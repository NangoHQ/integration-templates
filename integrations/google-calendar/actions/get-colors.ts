import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ColorDefinitionSchema = z.object({
    background: z.string().describe('The background color associated with this color definition'),
    foreground: z.string().describe('The foreground color that can be used to write on top of the background color')
});

const OutputSchema = z.object({
    kind: z.string().describe('Type of the resource'),
    updated: z.string().describe('Last modification time of the color palette (as a RFC3339 timestamp)'),
    calendar: z.record(z.string(), ColorDefinitionSchema).describe('A global palette of calendar colors, mapping from the color ID to its definition'),
    event: z.record(z.string(), ColorDefinitionSchema).describe('A global palette of event colors, mapping from the color ID to its definition')
});

const action = createAction({
    description: 'Return available calendar and event color definitions',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/get-colors',
        group: 'Calendar'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/colors/get
        const response = await nango.get({
            endpoint: '/calendar/v3/colors',
            retries: 3
        });

        return {
            kind: response.data.kind,
            updated: response.data.updated,
            calendar: response.data.calendar,
            event: response.data.event
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
