import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_id: z.string().describe('The ID of the file or shared drive.'),
    permission_id: z.string().describe('The ID of the permission.'),
    role: z.enum(['owner', 'organizer', 'fileOrganizer', 'writer', 'commenter', 'reader']).describe('The new role for the permission.')
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.union([z.string(), z.null()]),
    role: z.string(),
    emailAddress: z.union([z.string(), z.null()]),
    domain: z.union([z.string(), z.null()]),
    displayName: z.union([z.string(), z.null()]),
    allowFileDiscovery: z.union([z.boolean(), z.null()]),
    kind: z.union([z.string(), z.null()])
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
            endpoint: `/drive/v3/files/${input.file_id}/permissions/${input.permission_id}`,
            data: {
                role: input.role
            },
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Permission not found',
                file_id: input.file_id,
                permission_id: input.permission_id
            });
        }

        return {
            id: response.data.id,
            type: response.data.type ?? null,
            role: response.data.role,
            emailAddress: response.data.emailAddress ?? null,
            domain: response.data.domain ?? null,
            displayName: response.data.displayName ?? null,
            allowFileDiscovery: response.data.allowFileDiscovery ?? null,
            kind: response.data.kind ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
