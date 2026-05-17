import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    meeting_id: z.string().describe('The meeting ID in long format. Example: "85746065"'),
    registrant_id: z.string().describe('The registrant ID. Example: "ESJWWYqvTDWFGNUqJzB_bQ"'),
    email: z.string().describe('The registrant email address. Example: "user@example.com"'),
    action: z.enum(['approve', 'cancel', 'deny']).describe('The status action to apply. Example: "approve"'),
    occurrence_id: z.string().optional().describe('The meeting occurrence ID for recurring meetings.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    meeting_id: z.string(),
    registrant_id: z.string(),
    action: z.enum(['approve', 'cancel', 'deny'])
});

const action = createAction({
    description: 'Update a meeting registrant status in Zoom.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-meeting-registrant',
        group: 'Meetings'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['meeting:write:admin', 'meeting:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.zoom.us/docs/api/meetings/#tag/Meetings/operation/meetingRegistrantStatus
        await nango.put({
            endpoint: `/meetings/${encodeURIComponent(encodeURIComponent(input.meeting_id))}/registrants/status`,
            params: {
                ...(input.occurrence_id !== undefined && { occurrence_id: input.occurrence_id })
            },
            data: {
                action: input.action,
                registrants: [
                    {
                        id: input.registrant_id,
                        email: input.email
                    }
                ]
            },
            retries: 1
        });

        return {
            success: true,
            meeting_id: input.meeting_id,
            registrant_id: input.registrant_id,
            action: input.action
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
