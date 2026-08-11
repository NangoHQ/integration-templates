import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required.');

const ColorDefinitionSchema = z.object({
    background: z.string().describe('The background color associated with this color definition.'),
    foreground: z.string().describe('The foreground color that can be used to write on top of the background color.')
});

const OutputSchema = z
    .object({
        kind: z.string().optional().describe('Type of the resource, typically "calendar#colors".'),
        updated: z.string().optional().describe('Last modification time of the color palette as an RFC3339 timestamp.'),
        calendar: z
            .record(z.string(), ColorDefinitionSchema)
            .optional()
            .describe('A global palette of calendar colors, mapping from the color ID to its definition.'),
        event: z.record(z.string(), ColorDefinitionSchema).optional().describe('A global palette of event colors, mapping from the color ID to its definition.')
    })
    .describe('Available calendar and event color definitions.');

/**
 * @tags: [read]
 * @tagReason: Reads the available calendar and event color definitions from the provider.
 * @pitfalls: The returned palette is global and static; calendar and event colors are separate palettes with different available entries, so not all calendar color IDs are valid for events.
 */
const action = createAction({
    description: 'Return available calendar and event color definitions',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.google.com/workspace/calendar/api/v3/reference/colors/get
            endpoint: '/calendar/v3/colors',
            retries: 3
        });

        const colors = OutputSchema.parse(response.data);

        return colors;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
