import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    meetingId: z.number().describe('The meeting ID. Example: 123456789'),
    registrantId: z.string().describe('The meeting registrant ID. Example: "abc123"'),
    occurrenceId: z.string().optional().describe('The meeting occurrence ID. Example: "def456"')
});

const OutputSchema = z.object({
    meetingId: z.number(),
    registrantId: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete or archive a meeting registrant in Zoom.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-meeting-registrant',
        group: 'Meetings'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['meeting:write', 'meeting:write:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.occurrenceId !== undefined) {
            params['occurrence_id'] = input.occurrenceId;
        }

        await nango.delete({
            // https://developers.zoom.us/docs/api/meetings/#tag/Meeting-Registrants/operation/meetingregistrantdelete
            endpoint: `/meetings/${input.meetingId}/registrants/${input.registrantId}`,
            params,
            retries: 1
        });

        return {
            meetingId: input.meetingId,
            registrantId: input.registrantId,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
