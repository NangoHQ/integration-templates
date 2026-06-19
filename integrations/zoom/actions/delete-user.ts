import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The user ID or email address of the user to delete. Example: "user@example.com"'),
    action: z
        .enum(['disassociate', 'delete'])
        .optional()
        .describe('Delete action: disassociate (default) removes the user from the account; delete permanently removes the user.'),
    transfer_email: z.string().optional().describe('Email address of the user to transfer meetings, webinars, and recordings to before deletion.'),
    transfer_meeting: z.boolean().optional().describe('Whether to transfer meetings to the transfer_email user. Default: true.'),
    transfer_webinar: z.boolean().optional().describe('Whether to transfer webinars to the transfer_email user. Default: true.'),
    transfer_recording: z.boolean().optional().describe('Whether to transfer cloud recordings to the transfer_email user. Default: true.')
});

const OutputSchema = z.object({
    userId: z.string().describe('The ID of the deleted or archived user.')
});

const action = createAction({
    description: 'Delete or archive a user in Zoom.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user:write:admin', 'user:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.action !== undefined) {
            params['action'] = input.action;
        }
        if (input.transfer_email !== undefined) {
            params['transfer_email'] = input.transfer_email;
        }
        if (input.transfer_meeting !== undefined) {
            params['transfer_meeting'] = input.transfer_meeting.toString();
        }
        if (input.transfer_webinar !== undefined) {
            params['transfer_webinar'] = input.transfer_webinar.toString();
        }
        if (input.transfer_recording !== undefined) {
            params['transfer_recording'] = input.transfer_recording.toString();
        }

        await nango.delete({
            // https://developers.zoom.us/docs/api/rest/reference/user/methods/#operation/deleteUser
            endpoint: `/users/${input.userId}`,
            params,
            retries: 1
        });

        return {
            userId: input.userId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
