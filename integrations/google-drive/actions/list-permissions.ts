import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fileId: z.string().describe('The ID of the file to list permissions for. Example: "1AoQyTafvg1p_cqzJTTGmdbMTQ6jolnJ7J_mQBlPcFec"'),
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.'),
    pageSize: z.number().min(1).max(100).optional().describe('Maximum number of permissions to return per page (1-100). Default: 100')
});

const PermissionSchema = z.object({
    id: z.string(),
    type: z.string(),
    role: z.string(),
    emailAddress: z.string().optional(),
    displayName: z.string().optional(),
    domain: z.string().optional()
});

const OutputSchema = z.object({
    permissions: z.array(PermissionSchema),
    nextPageToken: z.string().optional()
});

const action = createAction({
    description: 'List permissions on a file',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/list-permissions',
        group: 'Permissions'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config = {
            // https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions/list
            endpoint: `/drive/v3/files/${input.fileId}/permissions`,
            params: {
                supportsAllDrives: 'true',
                ...(input.pageSize && { pageSize: input.pageSize.toString() }),
                ...(input.cursor && { pageToken: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data || !response.data.permissions) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No permissions found or file does not exist',
                fileId: input.fileId
            });
        }

        const permissions = response.data.permissions.map((perm: any) => ({
            id: perm.id,
            type: perm.type,
            role: perm.role,
            emailAddress: perm.emailAddress ?? undefined,
            displayName: perm.displayName ?? undefined,
            domain: perm.domain ?? undefined
        }));

        return {
            permissions,
            nextPageToken: response.data.nextPageToken || undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
