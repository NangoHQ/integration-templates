import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        incident_id: z.string().describe('The ID of the incident containing the note. Example: "Q3NJ6O318IPQU0"'),
        note_id: z.string().describe('The ID of the note to delete. Example: "PEVWHPJ"')
    })
    .describe('Input parameters to delete a note from a PagerDuty incident.');

const OutputSchema = z.null().describe('Empty response indicating the note was deleted successfully.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a note from a PagerDuty incident.
 */
const action = createAction({
    description: 'Delete a note from an incident.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.pagerduty.com/api-reference/
        await nango.delete({
            endpoint: `/incidents/${encodeURIComponent(input.incident_id)}/notes/${encodeURIComponent(input.note_id)}`,
            headers: {
                From: 'api@nango.dev'
            },
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
