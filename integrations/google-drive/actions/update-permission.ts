import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fileId: z.string().describe('The ID of the file or shared drive.'),
    permissionId: z.string().describe('The ID of the permission.'),
    role: z.enum(['owner', 'organizer', 'fileOrganizer', 'writer', 'commenter', 'reader']).describe('The new role for the permission.')
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    role: z.string(),
    emailAddress: z.string().optional(),
    domain: z.string().optional(),
    displayName: z.string().optional(),
    allowFileDiscovery: z.boolean().optional(),
    kind: z.string().optional()
});

const action = createAction({
    description: 'Update a permission on a file',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/update-permission',
        group: 'Permissions'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.file'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions/update
        const response = await nango.patch({
            endpoint: `/drive/v3/files/${input.fileId}/permissions/${input.permissionId}`,
            data: {
                role: input.role
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Permission not found',
                fileId: input.fileId,
                permissionId: input.permissionId
            });
        }

        return {
            id: response.data.id,
            type: response.data.type ?? undefined,
            role: response.data.role,
            emailAddress: response.data.emailAddress ?? undefined,
            domain: response.data.domain ?? undefined,
            displayName: response.data.displayName ?? undefined,
            allowFileDiscovery: response.data.allowFileDiscovery ?? undefined,
            kind: response.data.kind ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
