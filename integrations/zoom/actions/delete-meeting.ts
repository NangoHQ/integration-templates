import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    meetingId: z.string().describe('The meeting ID to delete. Example: "123456789"'),
    occurrenceId: z.string().optional().describe('The meeting occurrence ID for recurring meetings. Example: "abc123"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    meetingId: z.string()
});

const action = createAction({
    description: 'Delete or archive a meeting in Zoom.',
    version: '2.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-meeting',
        group: 'Meetings'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['meeting:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://zoom.github.io/api/#operation/deleteMeeting
        await nango.delete({
            endpoint: `/meetings/${input.meetingId}`,
            params: {
                ...(input.occurrenceId && { occurrence_id: input.occurrenceId })
            },
            retries: 3
        });

        return {
            success: true,
            meetingId: input.meetingId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
