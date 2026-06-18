import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    meeting_id: z.string().describe('The meeting ID or meeting UUID. Example: "123456789"'),
    action: z
        .enum(['trash', 'delete'])
        .optional()
        .describe('The recording delete action. "trash" moves the recording to trash (default), "delete" permanently deletes the recording.')
});

const OutputSchema = z.object({
    meeting_id: z.string(),
    action: z.string().optional(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete or archive a recording in Zoom.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['recording:write', 'recording:write:admin', 'cloud_recording:delete:meeting_recording', 'cloud_recording:delete:meeting_recording:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.zoom.us/docs/api/rest/reference/zoom-api/cloud-recording/recordingdelete
        await nango.delete({
            endpoint: `/meetings/${encodeURIComponent(encodeURIComponent(input.meeting_id))}/recordings`,
            params: {
                ...(input.action !== undefined && { action: input.action })
            },
            retries: 1
        });

        return {
            meeting_id: input.meeting_id,
            ...(input.action !== undefined && { action: input.action }),
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
